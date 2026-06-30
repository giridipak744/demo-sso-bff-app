import { createContext, useContext, useEffect, useState } from 'react';
import apiFetch from '../lib/api';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Wraps the app and provides user state and auth actions to every component.
 *
 * BFF Pattern:
 *  - Tokens NEVER reach the browser — stored server-side in Redis
 *  - Browser only holds an HttpOnly session cookie
 *  - login  → full-page navigation to backend (backend owns the OAuth redirect chain)
 *  - logout → fetch POST to backend; backend responds with { redirectUrl };
 *             frontend does window.location.href — browser never visits Keycloak
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Shared helper — calls /auth/me and updates user state.
  // Returns true if session is alive, false if it is gone.
  // If redirectOnDead=true and session is gone, we do a hard redirect to '/'.
  // This is needed for backchannel logout: React state alone won't kick the user
  // off a protected route reliably if they are actively using the page.
  async function syncSession({ redirectOnDead = false } = {}) {
    try {
      const data = await apiFetch('/auth/me');
      setUser(data);
      return true;
    } catch {
      setUser(null);
      if (redirectOnDead) {
        // Hard navigate so the protected route is fully torn down
        window.location.href = '/?reason=session_expired';
      }
      return false;
    }
  }

  // Initial session check on mount
  useEffect(() => {
    syncSession().finally(() => setLoading(false));
  }, []);

  // Re-validate session every time the tab becomes visible again.
  // If the backend session was deleted (e.g. admin killed it, backchannel logout),
  // the next time the user switches back to this tab they will be hard-redirected to '/'.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') syncSession({ redirectOnDead: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Heartbeat: poll /auth/me every 30 seconds while user is logged in and tab is visible.
  //
  // WHY THIS IS NEEDED:
  // In production, Keycloak calls our /auth/backchannel-logout webhook to instantly kill
  // sessions when a user logs out from another app. But in local development, our backend
  // runs on localhost which is unreachable from the remote Keycloak server — so backchannel
  // logout is never triggered here.
  //
  // This polling compensates by proactively asking the backend "am I still valid?".
  // The /auth/me route goes through requireAuth middleware, which tries to silently refresh
  // the access_token. If the Keycloak SSO session is dead (external logout), the refresh
  // fails with invalid_grant and the backend returns 401 → frontend does a hard redirect.
  //
  // In production (where backchannel works), this is just a cheap safety net.
  useEffect(() => {
    // Only start polling once the user is confirmed logged in
    if (!user) return;

    const POLL_INTERVAL_MS = 30_000; // 30 seconds

    const intervalId = setInterval(() => {
      // Skip poll if the tab is hidden — no point waking up a background tab
      if (document.visibilityState !== 'visible') return;
      syncSession({ redirectOnDead: true });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [user]); // restart interval whenever user state changes

  /**
   * Full-page navigation to backend /auth/login
   * Backend generates state+nonce → redirects browser to Keycloak
   * Keycloak → backend /auth/callback → backend sets cookie → redirects to frontend
   */
  function login(returnTo = '/dashboard') {
    window.location.href = `${API_BASE}/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  /**
   * Calls backend /auth/logout.
   * Backend handles local session cleanup + Keycloak logout server-side and
   * returns { redirectUrl }. Frontend only performs local navigation.
   */
  async function logout() {
    try {
      const data = await apiFetch('/auth/logout', { method: 'POST' });
      // Always hard-navigate so the React app fully re-mounts and user state is cleared
      window.location.href = data?.redirectUrl ?? `${window.location.origin}/`;
    } catch {
      // Even on network error, force redirect to landing page
      window.location.href = `${window.location.origin}/`;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, checkSession: syncSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
