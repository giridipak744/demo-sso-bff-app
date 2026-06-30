const { getOidcClient } = require('../lib/oidcClient');

/**
 * Middleware that:
 *  1. Rejects unauthenticated requests with 401.
 *  2. Silently refreshes the access token when it is within 60 seconds of expiry.
 *  3. Destroys the session and returns 401 when the refresh token is also expired.
 *
 * Attach this to any route that requires an authenticated user.
 */
async function requireAuth(req, res, next) {
  if (!req.session?.claims) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = req.session.claims.exp;

  // Refresh the access token proactively if it expires within 60 seconds
  if (now >= expiresAt - 60) {
    try {
      const client = await getOidcClient();
      const tokenSet = await client.refresh(req.session.refreshToken);

      req.session.accessToken = tokenSet.access_token;
      req.session.refreshToken = tokenSet.refresh_token;
      req.session.idToken = tokenSet.id_token;
      req.session.claims = tokenSet.claims();
      
      console.log(`[requireAuth] Proactively refreshed token for user ${req.session.claims.sub}. Updated session in Redis.`);
      console.log(`[requireAuth] New access_token:\n${tokenSet.access_token}`);
      console.log(`[requireAuth] New refresh_token:\n${tokenSet.refresh_token}`);
    } catch (err) {
      console.warn('[requireAuth] refresh failed, destroying session:', err.message);
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
  }

  next();
}

module.exports = { requireAuth };
