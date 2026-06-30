const session = require('express-session');
const RedisStore = require('connect-redis').default;
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => console.log('[redis] connected'));
redis.on('error', (err) => console.error('[redis] error:', err.message));

const sessionMiddleware = session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  // Using a non-default name avoids leaking the server tech stack
  name: 'app.sid',
  cookie: {
    httpOnly: true,                      // JS in browser cannot read this cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,         // 8 hours — matches refresh token lifetime
  },
});

module.exports = { sessionMiddleware, redis };
