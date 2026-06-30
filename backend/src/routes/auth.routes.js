const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const {
  login,
  callback,
  logout,
  me,
  backchannelLogout,
} = require('../controllers/auth.controller');


const router = express.Router();

// Initiates the Keycloak login flow
router.get('/login', login);

// Keycloak redirects here after the user authenticates
router.get('/callback', callback);

// Destroys local session + logs out from Keycloak server-to-server.
// Returns JSON { redirectUrl }.
router.post('/logout', logout);

// Returns the authenticated user's profile claims — no raw tokens ever
router.get('/me', requireAuth, me);

// Keycloak calls this server-to-server when another app triggers a logout
router.post('/backchannel-logout', backchannelLogout);

module.exports = router;
