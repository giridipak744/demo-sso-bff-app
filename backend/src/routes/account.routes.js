const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const {
  getAccountProfile,
  updateAccountProfile,
  getCredentials,
  deleteCredential,
  updateCredentialLabel,
  getAccountSessions,
  deleteAllSessions,
  deleteSession,
} = require('../controllers/account.controller');

const router = express.Router();

// All account routes require an authenticated session
router.use(requireAuth);

// ── Profile ──────────────────────────────────────────────────────────────
router.get('/profile', getAccountProfile);
router.put('/profile', updateAccountProfile);

// ── Credentials (password, passkey, TOTP) ────────────────────────────────
router.get('/credentials', getCredentials);
router.delete('/credentials/:id', deleteCredential);
router.put('/credentials/:id/label', updateCredentialLabel);

// ── Sessions ─────────────────────────────────────────────────────────────
router.get('/sessions', getAccountSessions);
router.delete('/sessions', deleteAllSessions);
router.delete('/sessions/:id', deleteSession);

module.exports = router;
