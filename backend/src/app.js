const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sessionMiddleware } = require('./config/session');
const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const accountRouter = require('./routes/account.routes');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the React frontend to send cookies with every request
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
// urlencoded is needed to receive the Keycloak backchannel logout token
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Session ───────────────────────────────────────────────────────────────────
app.use(sessionMiddleware);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/account', accountRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
