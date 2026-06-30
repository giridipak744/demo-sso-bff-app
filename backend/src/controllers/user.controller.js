const axios = require('axios');
const { logoutAllSessions } = require('../lib/adminLogout');

/**
 * GET /api/user/profile
 *
 * Returns the full profile for the currently authenticated user.
 * Data comes from the session claims already parsed at login time —
 * no additional Keycloak call is needed for basic profile info.
 */
function getProfile(req, res) {
  const claims = req.session.claims;

  res.json({
    sub: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified,
    username: claims.preferred_username,
    firstName: claims.given_name,
    lastName: claims.family_name,
    fullName: claims.name,
    picture: claims.picture || null,
    // Custom claims from Keycloak token mappers
    persona: claims.persona || null,
    phone: claims.phone_number || null,
    // realm_access.roles comes from Keycloak's default token mapper
    roles: claims.realm_access?.roles || [],
    // Per-client role assignments
    resourceAccess: claims.resource_access || {},
  });
}

/**
 * GET /api/user/sessions
 *
 * Calls the Keycloak admin API to list all active sessions for this user.
 * Useful for displaying a "devices logged in" view in the account page.
 */
async function getSessions(req, res) {
  try {
    const userId = req.session.claims.sub;

    // Use the service account token (not the user's access token) to call the admin API.
    // The service account needs the manage-users role in realm-management.
    const { getServiceAccountToken } = require('../lib/adminLogout');
    const saToken = await getServiceAccountToken();

    const url =
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}` +
      `/users/${userId}/sessions`;

    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${saToken}` },
    });

    const sessions = data.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      started: new Date(s.start * 1000).toISOString(),
      lastAccess: new Date(s.lastAccess * 1000).toISOString(),
      clients: Object.values(s.clients || {}),
    }));

    res.json({ sessions });
  } catch (err) {
    console.error('[user/sessions]', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not fetch sessions' });
  }
}

/**
 * DELETE /api/user/sessions
 *
 * Revokes all sessions for the current user on all devices.
 * This is exposed as its own endpoint so the frontend can offer
 * a "log out of all devices" button separate from a normal logout.
 */
async function revokeAllSessions(req, res) {
  try {
    const userId = req.session.claims.sub;

    await logoutAllSessions(userId);

    // Destroy the current session too so the user must re-login
    req.session.destroy(() => {});

    res.json({ message: 'All sessions revoked' });
  } catch (err) {
    console.error('[user/revoke-sessions]', err.message);
    res.status(500).json({ error: 'Could not revoke sessions' });
  }
}

module.exports = { getProfile, getSessions, revokeAllSessions };
