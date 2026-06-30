import './LoggedOutPage.css';

export default function LoggedOutPage() {
  return (
    <div className="logged-out-root">
      <div className="lo-blob lo-blob-1" />
      <div className="lo-blob lo-blob-2" />

      <div className="logged-out-card">
        <div className="lo-icon-wrap">
          <span className="lo-icon">🔓</span>
        </div>
        <h1 className="lo-title">You've been signed out</h1>
        <p className="lo-subtitle">
          Your session has ended and all active sessions have been revoked successfully.
        </p>
        <a id="sign-in-again-btn" href="/" className="lo-btn">
          ← Back to Login
        </a>
        <p className="lo-powered">Powered by <strong>Keycloak SSO</strong></p>
      </div>
    </div>
  );
}
