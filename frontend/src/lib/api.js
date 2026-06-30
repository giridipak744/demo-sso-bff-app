/**
 * Backend base URL — read from env so this works in dev and production.
 * In dev: http://localhost:8000 (direct call to backend, no Vite proxy)
 * In prod: set VITE_API_URL to your deployed backend origin
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Thin wrapper around fetch that:
 *  - Always sends the session cookie (credentials: 'include')
 *  - Uses the backend base URL directly — no Vite proxy involved
 *  - Redirects to the landing page on 401 (for API calls other than /auth/me)
 */
async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',           // send session cookie on every request
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // On /auth/me, just throw so AuthContext sets user to null (landing page shows)
    // On other API calls, redirect to landing page
    if (path !== '/auth/me') {
      window.location.href = '/';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

export default apiFetch;
