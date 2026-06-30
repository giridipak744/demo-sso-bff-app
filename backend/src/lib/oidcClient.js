const { Issuer } = require('openid-client');

let _client = null;

/**
 * Returns a singleton OIDC client bootstrapped via discovery.
 * Discovery reads all Keycloak endpoint URLs automatically from
 * /.well-known/openid-configuration, so we never hardcode them.
 */
async function getOidcClient() {
  if (_client) return _client;

  const issuerUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}`;

  const issuer = await Issuer.discover(issuerUrl);

  _client = new issuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
    redirect_uris: [process.env.APP_CALLBACK_URL],
    response_types: ['code'],
  });

  console.log('[oidc] client ready — issuer:', issuer.issuer);
  return _client;
}

module.exports = { getOidcClient };
