const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const {
  getProfile,
  getSessions,
  revokeAllSessions,
} = require('../controllers/user.controller');

const router = express.Router();

// All user routes require an authenticated session
router.use(requireAuth);

// Full user profile from session claims
router.get('/profile', getProfile);

// Active Keycloak sessions across all devices
router.get('/sessions', getSessions);

// Revoke all sessions for this user on every device
router.delete('/sessions', revokeAllSessions);

module.exports = router;
