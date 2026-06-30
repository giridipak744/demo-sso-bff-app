const crypto = require('crypto');
const { getOidcClient } = require('../lib/oidcClient');
const { revokeSessionByRefreshToken } = require('../lib/adminLogout');
const { destroySessionsBySid } = require('../lib/sessionHelpers');
const { redis } = require('../config/session');

/**
 * GET /auth/login
 *
 * Generates a CSRF-safe state and a replay-safe nonce, stores both in the
 * pre-login session, then redirects the browser to Keycloak.
 */
async function login(req, res) {
  try {
    const client = await getOidcClient();
    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');

    req.session.oauthState = state;
    req.session.oauthNonce = nonce;
    // Remember where the user was going so we can send them back after login
    req.session.returnTo = req.query.returnTo || '/';

    const authUrl = client.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce,
    });

    console.log(`[auth/login] Initiating login flow. Redirecting user to Keycloak: ${authUrl.split('?')[0]}...`);

    res.redirect(authUrl);
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Could not initiate login' });
  }
}

/**
 * GET /auth/callback
 *
 * Keycloak redirects the browser here after the user authenticates.
 * We verify state/nonce, exchange the code for tokens, store everything
 * in the session, and send the user back to the app.
 */
async function callback(req, res) {
  try {
    const client = await getOidcClient();
    const params = client.callbackParams(req);

    const tokenSet = await client.callback(
      process.env.APP_CALLBACK_URL,
      params,
      {
        state: req.session.oauthState,
        nonce: req.session.oauthNonce,
      }
    );

    const claims = tokenSet.claims();

    console.log(`[auth/callback] Successfully exchanged code for tokens. User: ${claims.email} (sub: ${claims.sub})`);
    console.log(`[auth/callback] Saving access_token and refresh_token to Redis session (Session ID: ${req.session.id})`);
    console.log(`[auth/callback] access_token:\n${tokenSet.access_token}`);
    console.log(`[auth/callback] refresh_token:\n${tokenSet.refresh_token}`);


    // Store tokens server-side only — never send them to the browser
    req.session.accessToken = tokenSet.access_token;
    req.session.refreshToken = tokenSet.refresh_token;
    req.session.idToken = tokenSet.id_token;
    req.session.claims = claims;
    // sid is Keycloak's session ID — needed to locate this session during backchannel logout
    req.session.sid = claims.sid;

    const returnTo = req.session.returnTo || '/';

    // Clean up the one-time values used during the auth flow
    delete req.session.oauthState;
    delete req.session.oauthNonce;
    delete req.session.returnTo;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Explicitly save the session so we can safely register the sid index
    // immediately after — before the browser follows the redirect.
    req.session.save(async (saveErr) => {
      if (saveErr) console.error('[auth/callback] session save error:', saveErr.message);

      // Secondary index: sid (Keycloak session ID) → Express session ID.
      // Used by backchannel-logout for O(1) lookup instead of a full Redis scan.
      if (claims.sid) {
        try {
          const ttlSeconds = 8 * 60 * 60; // match cookie / session maxAge
          await redis.set(`sid:${claims.sid}`, req.session.id, 'EX', ttlSeconds);
          console.log(`[auth/callback] Saved Keycloak sid index to Redis: sid:${claims.sid} -> ${req.session.id}`);
        } catch (err) {
          console.error('[auth/callback] sid index error (non-blocking):', err.message);
        }
      }

      res.redirect(`${frontendUrl}${returnTo}`);
    });
  } catch (err) {
    console.error('[auth/callback]', err.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Redirect to landing page with an error flag — no /login route exists in the SPA
    res.redirect(`${frontendUrl}/?error=auth_failed`);
  }
}

/**
 * POST /auth/logout
 *
 * Pure BFF logout:
 * 1. Destroys the local session (removes from Redis, clears the cookie).
 * 2. Calls the Keycloak admin API server-to-server to revoke all sessions for
 *    this user on all devices.
 * 3. Returns JSON { redirectUrl } for the frontend to navigate locally.
 *
 * Frontend does not need to know Keycloak exists.
 */
async function logout(req, res) {
  const userId = req.session.claims?.sub;
  const keycloakSid = req.session.sid;
  const refreshToken = req.session.refreshToken;   // captured before destroy
  const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const redirectUrl = `${frontendBaseUrl}/`;

  console.log(`[auth/logout] User ${userId} requested logout. Destroying Express Session ID: ${req.session.id}`);

  req.session.destroy(async (destroyErr) => {
    if (destroyErr) console.error('[auth/logout] session destroy error:', destroyErr.message);

    // Tell the browser to drop the session cookie immediately
    res.clearCookie('app.sid', { path: '/' });

    // Remove the sid secondary index so backchannel-logout doesn't hit a
    // stale entry for a session that no longer exists.
    if (keycloakSid) {
      try {
        await redis.del(`sid:${keycloakSid}`);
      } catch (err) {
        console.error('[auth/logout] sid index cleanup error (non-blocking):', err.message);
      }
    }

    // Revoke the Keycloak SSO session via the standard OIDC logout endpoint.
    // Uses the user's refresh_token + app's own client_id/client_secret.
    // User action → client secret, not a service account.
    if (refreshToken) {
      try {
        await revokeSessionByRefreshToken(refreshToken);
        console.log('[auth/logout] Keycloak session revoked via refresh_token');
      } catch (err) {
        console.error('[auth/logout] Keycloak revocation error (non-blocking):', err.message);
      }
    }

    return res.json({ redirectUrl });
  });
}

/**
 * GET /auth/me
 *
 * Returns only the user claims the frontend actually needs.
 * Never exposes raw tokens.
 */
function me(req, res) {
  if (!req.session?.claims) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const {
    sub, email, email_verified, name,
    preferred_username, given_name, family_name,
    picture, realm_access,
  } = req.session.claims;

  console.log(`[auth/me] Sending user data to frontend for user: ${email}`);

  const payload = {
    sub,
    email,
    emailVerified: email_verified || false,
    name,
    username: preferred_username,
    firstName: given_name,
    lastName: family_name,
    picture: picture || null,
    roles: realm_access?.roles || [],
  };

  console.log(`[auth/me] Response payload:`, JSON.stringify(payload, null, 2));

  res.json(payload);
}

/**
 * POST /auth/backchannel-logout
 *
 * Keycloak calls this when another app in the realm triggers a logout.
 * We verify the signed logout_token, extract the Keycloak sid, and destroy
 * every local session associated with that sid.
 */
async function backchannelLogout(req, res) {
  try {
    const client = await getOidcClient();
    const logoutToken = req.body.logout_token;

    if (!logoutToken) {
      return res.status(400).json({ error: 'Missing logout_token' });
    }

    // openid-client verifies signature, iss, aud, and the backchannel event claim
    const claims = await client.backchannelLogout(logoutToken);
    const sid = claims.sid;

    if (!sid) {
      return res.status(400).json({ error: 'logout_token missing sid claim' });
    }

    console.log(`[auth/backchannel-logout] Received backchannel logout request from Keycloak for sid: ${sid}`);

    await destroySessionsBySid(sid);
    res.sendStatus(200);
  } catch (err) {
    console.error('[auth/backchannel-logout]', err.message);
    res.status(400).json({ error: 'Invalid logout token' });
  }
}

module.exports = { login, callback, logout, me, backchannelLogout };
