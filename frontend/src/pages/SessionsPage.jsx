import { useEffect, useState } from 'react';
import apiFetch from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './SessionsPage.css';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const data = await apiFetch('/api/account/sessions');
      // Sort so current session is first
      const sorted = (data.sessions || []).sort((a, b) => b.current - a.current);
      setSessions(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeAll() {
    if (!confirm('This will log you out of all other devices immediately. Continue?')) return;

    setRevoking(true);
    setError(null);
    try {
      await apiFetch('/api/account/sessions', { method: 'DELETE' });
      setSuccess('All other sessions revoked successfully.');
      fetchSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setRevoking(false);
    }
  }

  async function handleRevokeSingle(id) {
    setError(null);
    try {
      await apiFetch(`/api/account/sessions/${id}`, { method: 'DELETE' });
      setSessions(sessions.filter((s) => s.id !== id));
      setSuccess('Session logged out successfully.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <h1 className="page-title">Active Session(s) ({sessions.length})</h1>
        <p className="sessions-subtitle">
          Sign out of any unfamiliar devices.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {sessions.length === 0 ? (
        <div className="card empty-state">
          <p>No session data available.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onLogout={() => handleRevokeSingle(session.id)}
            />
          ))}
        </div>
      )}

      <div className="card logout-info-card">
        <h3>About session management</h3>
        <p>
          Clicking <strong>Log out all other devices</strong> below will immediately revoke every active
          session for your account across all devices and applications, except for this current one.
        </p>
        <button
          className="btn-danger mt-3"
          onClick={handleRevokeAll}
          disabled={revoking || sessions.length <= 1}
        >
          {revoking ? 'Logging out...' : 'Log out all other devices'}
        </button>
      </div>
    </div>
  );
}

function SessionCard({ session, onLogout }) {
  const started = new Date(session.started * 1000).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  // e.g. "Chrome/149.0.0 / Linux"
  const deviceTitle = [session.browser, session.os].filter(Boolean).join(' / ') || 'Unknown Device';

  return (
    <div className="card session-card">
      <div className="session-card-header">
        <div className="session-device-title">
          {deviceTitle}
        </div>
        {session.current ? (
          <span className="badge badge-success">Current session</span>
        ) : (
          <button className="btn-outline session-logout-btn" onClick={onLogout}>
            Log out
          </button>
        )}
      </div>

      <div className="session-meta">
        <div className="session-meta-row">
          <span className="session-ip">{session.ipAddress}</span>
          <span className="session-dot">•</span>
          <span className="session-started">Started {started}</span>
        </div>
        
        <div className="session-clients">
          {session.clients.map(c => (
            <span key={c.clientId} className="client-badge">
              {c.clientName || c.clientId}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
