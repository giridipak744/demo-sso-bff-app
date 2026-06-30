import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './LandingPage.css';

export default function LandingPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, go straight to dashboard — no need to show landing
  useEffect(() => {
    if (!loading && user) {
      navigate('/profile', { replace: true });
    }
  }, [user, loading, navigate]);

  // Check for auth error in URL (e.g. after a failed callback)
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('error');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="landing-root">
      {/* Animated background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="landing-container">
        {/* Left — Branding */}
        <div className="landing-hero">
          <div className="landing-logo-wrap">
            <span className="landing-logo-icon">⬡</span>
          </div>
          <h1 className="landing-headline">
            Corenroll<br />
            <span className="landing-headline-accent">Account Portal</span>
          </h1>
          <p className="landing-tagline">
            Secure, single sign-on access to all your Corenroll services.
            Your identity, protected end-to-end.
          </p>
          <ul className="landing-features">
            <li><span className="feat-icon">🔒</span> Zero tokens in the browser</li>
            <li><span className="feat-icon">♻️</span> Silent token refresh</li>
            <li><span className="feat-icon">📱</span> Global session management</li>
            <li><span className="feat-icon">🛡️</span> CSRF &amp; replay attack protection</li>
          </ul>
        </div>

        {/* Right — Login card */}
        <div className="landing-card">
          <div className="landing-card-header">
            <span className="landing-card-logo">⬡</span>
            <span className="landing-card-brand">Corenroll</span>
          </div>

          <h2 className="landing-card-title">Welcome back</h2>
          <p className="landing-card-subtitle">
            Sign in with your organization credentials to continue.
          </p>

          {authError && (
            <div className="landing-error">
              ⚠️ Authentication failed. Please try again.
            </div>
          )}

          <button
            id="proceed-to-login-btn"
            className="landing-btn"
            onClick={() => login('/profile')}
          >
            <span className="landing-btn-icon">🔐</span>
            Proceed to Login
          </button>

          <p className="landing-card-note">
            You will be redirected to your organization's secure login page.
            No registration required.
          </p>

          <div className="landing-divider" />

          <p className="landing-powered">
            Powered by <strong>Keycloak SSO</strong> &middot; BFF Pattern
          </p>
        </div>
      </div>
    </div>
  );
}
