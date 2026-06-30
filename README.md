# Keycloak SSO Integration — React + Express (BFF Pattern)

This project is a practical, runnable example of integrating Keycloak SSO into a full-stack app using the Backend-For-Frontend (BFF) pattern. It produces a custom account portal similar to Keycloak's built-in account console, but built entirely with your own React frontend and Express backend.

---

## What this does

- The frontend never touches a JWT or stores any token. The only auth artifact in the browser is a session cookie.
- The Express backend handles the full OIDC Authorization Code Flow with Keycloak.
- The backend stores access, refresh, and ID tokens in Redis and exposes clean API endpoints for the frontend.
- Silent token refresh happens automatically in the auth middleware before every API call.
- Logout revokes all sessions for the user across all devices via the Keycloak admin API.
- Backchannel logout is implemented so Keycloak can notify this app when another app logs the user out.

---

## Project structure

```
keycloak-sso-app/
├── backend/
│   ├── src/
│   │   ├── server.js              Entry point
│   │   ├── app.js                 Express app, middleware, routes
│   │   ├── config/
│   │   │   └── session.js         Redis-backed session setup
│   │   ├── lib/
│   │   │   ├── oidcClient.js      OIDC client via discovery
│   │   │   ├── adminLogout.js     Keycloak admin API — revoke all sessions
│   │   │   └── sessionHelpers.js  Find and destroy sessions by Keycloak sid
│   │   ├── middleware/
│   │   │   └── requireAuth.js     Auth guard + silent token refresh
│   │   ├── controllers/
│   │   │   ├── auth.controller.js login, callback, logout, me, backchannel-logout
│   │   │   └── user.controller.js profile, sessions, revoke-all
│   │   └── routes/
│   │       ├── auth.routes.js
│   │       └── user.routes.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx               React entry
    │   ├── App.jsx                Root with AuthProvider + RouterProvider
    │   ├── index.css              Global styles
    │   ├── context/
    │   │   └── AuthContext.jsx    Global auth state, login/logout actions
    │   ├── lib/
    │   │   └── api.js             fetch wrapper — always sends cookie, handles 401
    │   ├── components/
    │   │   ├── AppLayout.jsx      Navbar + Outlet wrapper
    │   │   ├── Navbar.jsx
    │   │   ├── ProtectedRoute.jsx Redirects to login if no session
    │   │   └── LoadingSpinner.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   ├── SessionsPage.jsx
    │   │   └── LoggedOutPage.jsx
    │   └── routes/
    │       └── router.jsx         React Router v6 route definitions
    ├── vite.config.js             Dev proxy for /auth and /api → backend
    ├── .env.example
    └── package.json
```

---

## Backend API endpoints

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| GET | /auth/login | No | Redirects browser to Keycloak login |
| GET | /auth/callback | No | Handles Keycloak redirect, creates session |
| GET | /auth/logout | No | Destroys session, revokes all Keycloak sessions, redirects to Keycloak logout |
| GET | /auth/me | Yes | Returns user claims for the frontend (no raw tokens) |
| POST | /auth/backchannel-logout | No | Receives Keycloak logout webhook |
| GET | /api/user/profile | Yes | Full profile from session claims |
| GET | /api/user/sessions | Yes | Active Keycloak sessions from admin API |
| DELETE | /api/user/sessions | Yes | Revoke all sessions for this user |
| GET | /health | No | Health check |

---

## Step 1 — Keycloak configuration

### Create a realm

1. Open Keycloak Admin Console (e.g. http://localhost:8080).
2. In the top-left dropdown, click **Create Realm**.
3. Give it a name (e.g. `my-realm`) and click **Create**.

### Create the main application client

1. Go to **Clients** → **Create client**.
2. Set **Client ID** to `my-app` (or whatever you prefer — must match `KEYCLOAK_CLIENT_ID`).
3. Set **Client type** to `OpenID Connect`.
4. Click **Next**.
5. Enable **Standard flow** (Authorization Code Flow). Disable everything else.
6. Click **Next**, then **Save**.
7. In the **Settings** tab:
   - Set **Valid redirect URIs** to `http://localhost:3001/auth/callback`
   - Set **Valid post logout redirect URIs** to `http://localhost:5173/logged-out`
   - Set **Web origins** to `http://localhost:5173`
8. In the **Credentials** tab, set **Client Authenticator** to `Client Id and Secret`. Copy the secret into `KEYCLOAK_CLIENT_SECRET`.
9. In the **Advanced** tab → **Backchannel Logout URL**, set:
   `http://host.docker.internal:3001/auth/backchannel-logout`
   (use `localhost` if Keycloak is not in Docker).
10. Save.

### Create the service account client (for global logout)

1. Go to **Clients** → **Create client**.
2. Set **Client ID** to `my-app-service-account` (must match `KC_SA_CLIENT_ID`).
3. Set **Client type** to `OpenID Connect`.
4. Click **Next**.
5. Disable **Standard flow**. Enable **Service accounts roles** only.
6. Save.
7. In the **Credentials** tab, copy the secret into `KC_SA_CLIENT_SECRET`.
8. Go to the **Service accounts roles** tab.
9. Click **Assign role** → filter by **realm-management** client.
10. Assign **manage-users** only. Do not assign `realm-admin`.

### Create a test user

1. Go to **Users** → **Create new user**.
2. Fill in Username, Email, First name, Last name.
3. On the **Credentials** tab, set a password and disable **Temporary**.

### Optional — add a `persona` custom claim

If your tokens should include a `persona` claim:

1. Go to **Clients** → select your app client → **Client scopes** tab.
2. Click on the dedicated scope (e.g. `my-app-dedicated`).
3. **Add mapper** → **By configuration** → **User Attribute**.
4. Name: `persona`, User Attribute: `persona`, Token Claim Name: `persona`, Claim JSON Type: `String`. Enable all toggles.
5. On the user's **Attributes** tab, add `persona` with a value.

---

## Step 2 — Environment setup

### Backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in:

```
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=my-realm
KEYCLOAK_CLIENT_ID=my-app
KEYCLOAK_CLIENT_SECRET=<from Keycloak Credentials tab>
APP_CALLBACK_URL=http://localhost:3001/auth/callback
APP_POST_LOGOUT_URL=http://localhost:5173/logged-out
SESSION_SECRET=<any long random string>
REDIS_URL=redis://localhost:6379
KC_SA_CLIENT_ID=my-app-service-account
KC_SA_CLIENT_SECRET=<from service account Credentials tab>
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Frontend

```bash
cp frontend/.env.example frontend/.env
```

The frontend uses the Vite dev proxy, so no changes are needed for local development.

---

## Step 3 — Install and run

### Prerequisites

- Node.js 18+
- Redis running locally (`redis-server`) or via Docker:
  ```bash
  docker run -d -p 6379:6379 redis:alpine
  ```

### Install dependencies

```bash
# From the project root
npm run install:all

# Or individually:
cd backend && npm install
cd frontend && npm install
```

### Run in development

Open two terminals:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

The frontend dev server at http://localhost:5173 proxies all `/auth` and `/api` requests to the backend at http://localhost:3001, so the session cookie is on the same origin.

Open http://localhost:5173. Click **Sign in with SSO** to start the flow.

---

## How the auth flow works

1. User clicks "Sign in" → frontend navigates to `/auth/login`.
2. Backend generates `state` and `nonce`, stores them in a pre-login session, and redirects the browser to Keycloak.
3. User authenticates on Keycloak's login page.
4. Keycloak redirects the browser to `/auth/callback?code=...&state=...`.
5. Backend verifies `state`, exchanges the code for tokens server-to-server, stores everything in Redis, sets an `HttpOnly` session cookie, and redirects the browser to the frontend.
6. Frontend calls `/auth/me` with the cookie to get user info.
7. On subsequent API calls, the backend reads the session, checks token expiry, refreshes silently if needed, and serves the data.
8. On logout: backend destroys the session in Redis, calls the Keycloak admin API to revoke all sessions, and redirects the browser to Keycloak's logout endpoint to clear the SSO cookie.

---

## Security notes

- Tokens never leave the backend. The browser only holds a session cookie.
- Session cookie is `HttpOnly; Secure; SameSite=Lax` — inaccessible to JavaScript.
- `state` and `nonce` prevent CSRF and replay attacks.
- Token refresh happens automatically without user interruption.
- Refresh failure destroys the session and returns 401.
- Global logout terminates every active session for the user across all devices.
