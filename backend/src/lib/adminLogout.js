const axios = require('axios');

// Cache the service-account token so we don't re-authenticate on every logout
let _token = null;
let _expiry = 0;

/**
 * Gets a short-lived service account token using the client_credentials grant.
 * The service account client must have the manage-users role in realm-management.
 */
async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _expiry - 30) return _token;

  const tokenUrl =
    `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}` +
    `/protocol/openid-connect/token`;

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.KC_SA_CLIENT_ID,
    client_secret: process.env.KC_SA_CLIENT_SECRET,
  });

  const { data } = await axios.post(tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  _token = data.access_token;
  _expiry = now + data.expires_in;
  return _token;
}

/**
 * Revokes every active Keycloak session for the given userId.
 * This covers all devices and all applications in the realm.
 * userId is the Keycloak UUID — the `sub` claim from any token the user owns.
 */
async function logoutAllSessions(userId) {
  const token = await getServiceAccountToken();
  const url =
    `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}` +
    `/users/${userId}/logout`;

  await axios.post(url, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Revokes the specific Keycloak session tied to the given refresh token.
 *
 * This is the standard OIDC approach — no service account needed.
 * Uses the app's own client_id + client_secret with the user's refresh_token.
 * Keycloak marks the associated SSO session as logged-out immediately.
 */
async function revokeSessionByRefreshToken(refreshToken) {
  const url =
    `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}` +
    `/protocol/openid-connect/logout`;

  const params = new URLSearchParams({
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

module.exports = { logoutAllSessions, getServiceAccountToken, revokeSessionByRefreshToken };
