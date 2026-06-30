import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, checkSession } = useAuth();
  const [sessionStatus, setSessionStatus] = useState(null); // null | 'alive' | 'dead'
  const [checking, setChecking] = useState(false);

  async function handleCheckSession() {
    setChecking(true);
    setSessionStatus(null);
    const alive = await checkSession();
    setSessionStatus(alive ? 'alive' : 'dead');
    setChecking(false);
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-greeting">
          {greeting()}, {user?.firstName || user?.username} 👋
        </h1>
        <p className="dashboard-subtitle">
          Welcome to your Corenroll account. Here's what's in your account.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="card dashboard-card">
          <div className="dashboard-card-icon">👤</div>
          <div>
            <h3>Profile</h3>
            <p>Manage your personal information and account details.</p>
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="dashboard-card-icon">🔐</div>
          <div>
            <h3>Security</h3>
            <p>Review your active sessions and manage device access.</p>
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="dashboard-card-icon">✅</div>
          <div>
            <h3>Account verified</h3>
            <p>
              Your email {user?.email} is{' '}
              {user?.emailVerified ? 'verified' : 'not yet verified'}.
            </p>
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="dashboard-card-icon">🏷️</div>
          <div>
            <h3>Roles</h3>
            <p>
              {user?.roles?.length
                ? `You have ${user.roles.length} role(s) assigned.`
                : 'No roles assigned.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Session test panel ── */}
      <div className="card session-test-card">
        <h3>🧪 Session Test</h3>
        <p>Manually check if the backend session is still alive (useful for testing backchannel logout, Redis eviction, etc.).</p>
        <button className="btn" onClick={handleCheckSession} disabled={checking}>
          {checking ? 'Checking…' : 'Check Session'}
        </button>
        {sessionStatus === 'alive' && (
          <p className="session-status session-alive">✅ Session is valid — backend recognises you.</p>
        )}
        {sessionStatus === 'dead' && (
          <p className="session-status session-dead">❌ Session is gone — you will be redirected to login.</p>
        )}
      </div>
    </div>
  );
}
