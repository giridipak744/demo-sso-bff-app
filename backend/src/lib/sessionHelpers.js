const { redis } = require('../config/session');

/**
 * Destroys the Express session mapped to the given Keycloak sid.
 *
 * Uses a dedicated secondary index key  sid:<keycloakSid>  that the callback
 * controller writes at login time, giving us an O(1) lookup instead of a
 * full redis.keys() scan across all sessions.
 *
 * Called by the backchannel logout handler when Keycloak notifies us that a
 * user has logged out from another app in the realm.
 */
async function destroySessionsBySid(keycloakSid) {
  // O(1) lookup via the secondary index written at login
  const sessionId = await redis.get(`sid:${keycloakSid}`);

  if (!sessionId) {
    console.log(`[backchannel] no active session found for sid ${keycloakSid}`);
    return 0;
  }

  // Delete the Express session data and the secondary index together
  await redis.del(`sess:${sessionId}`, `sid:${keycloakSid}`);

  console.log(`[backchannel] destroyed session ${sessionId} for sid ${keycloakSid}`);
  return 1;
}

module.exports = { destroySessionsBySid };
