const axios = require('axios');

const KC_BASE = process.env.KEYCLOAK_BASE_URL;
const KC_REALM = process.env.KEYCLOAK_REALM;
const ACCOUNT_API = `${KC_BASE}/realms/${KC_REALM}/account`;

/**
 * Helper — makes an authenticated request to the Keycloak Account REST API
 * using the user's own access_token stored in the Redis session.
 */
async function kcAccountFetch(method, path, accessToken, data) {
  const url = `${ACCOUNT_API}${path}`;
  console.log(`[account] ${method.toUpperCase()} ${url}`);

  const res = await axios({
    method,
    url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    data,
    validateStatus: () => true, // don't throw on 4xx/5xx
  });

  return res;
}

// ────────────────────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/account/profile
 *
 * Fetches the full profile from Keycloak Account API, including custom
 * attributes like phone and persona that aren't in the OIDC token claims.
 */
async function getAccountProfile(req, res) {
  try {
    const kcRes = await kcAccountFetch('get', '/', req.session.accessToken);

    if (kcRes.status !== 200) {
      console.error('[account/profile] Keycloak error:', kcRes.status, kcRes.data);
      return res.status(kcRes.status).json({ error: 'Failed to fetch profile from Keycloak' });
    }

    const kc = kcRes.data;
    console.log('[account/profile] Fetched profile:', JSON.stringify(kc, null, 2));

    res.json({
      sub: kc.id,
      username: kc.username,
      email: kc.email,
      emailVerified: kc.emailVerified,
      firstName: kc.firstName,
      lastName: kc.lastName,
      // Custom attributes come as { key: [value] }
      phone: kc.attributes?.phone?.[0] || '',
      persona: kc.attributes?.persona?.[0] || '',
      // Keep all raw attributes for the UI
      attributes: kc.attributes || {},
    });
  } catch (err) {
    console.error('[account/profile] error:', err.message);
    res.status(500).json({ error: 'Could not fetch profile' });
  }
}

/**
 * PUT /api/account/profile
 *
 * Updates profile fields. Keycloak Account API expects the full user
 * representation — we merge only the changed fields.
 */
async function updateAccountProfile(req, res) {
  try {
    // First fetch current profile to get the full representation
    const currentRes = await kcAccountFetch('get', '/', req.session.accessToken);
    if (currentRes.status !== 200) {
      return res.status(currentRes.status).json({ error: 'Failed to fetch current profile' });
    }

    const current = currentRes.data;
    const { firstName, lastName, email, phone, persona } = req.body;

    // Merge updates into the current representation
    const updated = {
      ...current,
      firstName: firstName ?? current.firstName,
      lastName: lastName ?? current.lastName,
      email: email ?? current.email,
      attributes: {
        ...current.attributes,
        ...(phone !== undefined ? { phone: [phone] } : {}),
        ...(persona !== undefined ? { persona: [persona] } : {}),
      },
    };

    console.log('[account/profile] Updating profile:', JSON.stringify({
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.attributes?.phone,
      persona: updated.attributes?.persona,
    }));

    const updateRes = await kcAccountFetch('post', '/', req.session.accessToken, updated);

    if (updateRes.status >= 400) {
      console.error('[account/profile] Update failed:', updateRes.status, updateRes.data);
      return res.status(updateRes.status).json({ error: 'Failed to update profile' });
    }

    console.log('[account/profile] Profile updated successfully');
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[account/profile] update error:', err.message);
    res.status(500).json({ error: 'Could not update profile' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Credentials
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/account/credentials
 *
 * Returns all credentials the user has set up: password, passkeys, TOTP.
 */
async function getCredentials(req, res) {
  try {
    const kcRes = await kcAccountFetch('get', '/credentials', req.session.accessToken);

    if (kcRes.status !== 200) {
      console.error('[account/credentials] Keycloak error:', kcRes.status, kcRes.data);
      return res.status(kcRes.status).json({ error: 'Failed to fetch credentials' });
    }

    const credentials = kcRes.data.map((c) => ({
      id: c.id,
      type: c.type,                       // 'password', 'webauthn', 'otp'
      userLabel: c.userLabel || '',
      createdDate: c.createdDate,          // epoch millis
      credentialData: c.credentialData,     // JSON string with extra info
    }));

    console.log(`[account/credentials] Found ${credentials.length} credential(s)`);
    res.json({ credentials });
  } catch (err) {
    console.error('[account/credentials] error:', err.message);
    res.status(500).json({ error: 'Could not fetch credentials' });
  }
}

/**
 * DELETE /api/account/credentials/:id
 *
 * Removes a specific credential (passkey, TOTP). Cannot remove password.
 */
async function deleteCredential(req, res) {
  try {
    const { id } = req.params;
    console.log(`[account/credentials] Deleting credential: ${id}`);

    const kcRes = await kcAccountFetch('delete', `/credentials/${id}`, req.session.accessToken);

    if (kcRes.status >= 400) {
      console.error('[account/credentials] Delete failed:', kcRes.status, kcRes.data);
      return res.status(kcRes.status).json({ error: 'Failed to delete credential' });
    }

    res.json({ message: 'Credential removed' });
  } catch (err) {
    console.error('[account/credentials] delete error:', err.message);
    res.status(500).json({ error: 'Could not delete credential' });
  }
}

/**
 * PUT /api/account/credentials/:id/label
 *
 * Renames a credential (e.g. rename a passkey).
 */
async function updateCredentialLabel(req, res) {
  try {
    const { id } = req.params;
    const { label } = req.body;
    console.log(`[account/credentials] Renaming credential ${id} to "${label}"`);

    const kcRes = await kcAccountFetch(
      'put',
      `/credentials/${id}/userLabel`,
      req.session.accessToken,
      JSON.stringify(label),
    );

    if (kcRes.status >= 400) {
      console.error('[account/credentials] Rename failed:', kcRes.status, kcRes.data);
      return res.status(kcRes.status).json({ error: 'Failed to rename credential' });
    }

    res.json({ message: 'Credential renamed' });
  } catch (err) {
    console.error('[account/credentials] rename error:', err.message);
    res.status(500).json({ error: 'Could not rename credential' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Sessions
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/account/sessions
 *
 * Returns active sessions from the Keycloak Account API.
 * This gives richer data (browser, OS) compared to the admin API.
 */
async function getAccountSessions(req, res) {
  try {
    const kcRes = await kcAccountFetch('get', '/sessions', req.session.accessToken);

    if (kcRes.status !== 200) {
      console.error('[account/sessions] Keycloak error:', kcRes.status, kcRes.data);
      return res.status(kcRes.status).json({ error: 'Failed to fetch sessions' });
    }

    const sessions = kcRes.data.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      started: s.started,             // epoch seconds
      lastAccess: s.lastAccess,       // epoch seconds
      expires: s.expires,             // epoch seconds
      browser: s.browser || '',       // e.g. "Chrome/125.0.0"
      os: s.os || '',                 // e.g. "Linux"
      osVersion: s.osVersion || '',
      device: s.device || '',
      current: s.current || false,    // is this the current session?
      clients: s.clients || [],       // array of { clientId, clientName }
    }));

    console.log(`[account/sessions] Found ${sessions.length} active session(s)`);
    res.json({ sessions });
  } catch (err) {
    console.error('[account/sessions] error:', err.message);
    res.status(500).json({ error: 'Could not fetch sessions' });
  }
}

/**
 * DELETE /api/account/sessions
 *
 * Log out all other sessions (keeps current one alive).
 */
async function deleteAllSessions(req, res) {
  try {
    console.log('[account/sessions] Logging out all other sessions');
    const kcRes = await kcAccountFetch('delete', '/sessions', req.session.accessToken);

    if (kcRes.status >= 400) {
      console.error('[account/sessions] Logout all failed:', kcRes.status, kcRes.data);
      return res.status(kcRes.status).json({ error: 'Failed to log out sessions' });
    }

    res.json({ message: 'All other sessions logged out' });
  } catch (err) {
    console.error('[account/sessions] delete all error:', err.message);
    res.status(500).json({ error: 'Could not log out sessions' });
  }
}

/**
 * DELETE /api/account/sessions/:id
 *
 * Log out a specific session by its ID.
 */
async function deleteSession(req, res) {
  try {
    const { id } = req.params;
    console.log(`[account/sessions] Logging out session: ${id}`);
    const kcRes = await kcAccountFetch('delete', `/sessions/${id}`, req.session.accessToken);

    if (kcRes.status >= 400) {
      console.error('[account/sessions] Logout failed:', kcRes.status, kcRes.data);
      return res.status(kcRes.status).json({ error: 'Failed to log out session' });
    }

    res.json({ message: 'Session logged out' });
  } catch (err) {
    console.error('[account/sessions] delete error:', err.message);
    res.status(500).json({ error: 'Could not log out session' });
  }
}

module.exports = {
  getAccountProfile,
  updateAccountProfile,
  getCredentials,
  deleteCredential,
  updateCredentialLabel,
  getAccountSessions,
  deleteAllSessions,
  deleteSession,
};
