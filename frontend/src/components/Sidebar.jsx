import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const initials = user
    ? (user.firstName?.[0] || '') + (user.lastName?.[0] || user.email?.[0] || '')
    : '';

  return (
    <aside className="sidebar">
      {/* User avatar + email */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials.toUpperCase()}</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
          </span>
          <span className="sidebar-user-email">{user?.email}</span>
        </div>
      </div>

      {/* Navigation sections */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <span className="sidebar-section-label">Account</span>
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">👤</span>
            Personal Info
          </NavLink>
          <NavLink to="/security" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">🔐</span>
            Account Security
          </NavLink>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-label">Signing In</span>
          <NavLink to="/sessions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">🖥️</span>
            Device Activity
          </NavLink>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-label">Activity</span>
          <NavLink to="/activity" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">📋</span>
            Sign-in Activity
          </NavLink>
        </div>
      </nav>

      {/* Logout at bottom */}
      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={logout}>
          <span className="sidebar-icon">🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
