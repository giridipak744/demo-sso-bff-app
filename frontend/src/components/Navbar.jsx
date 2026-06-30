import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();

  const initials = user
    ? (user.firstName?.[0] || '') + (user.lastName?.[0] || user.email?.[0] || '')
    : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">⬡</span>
        <span className="navbar-title">Corenroll Account</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Profile
        </NavLink>
        <NavLink to="/sessions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Sessions
        </NavLink>
      </div>

      <div className="navbar-user">
        <div className="avatar">{initials.toUpperCase()}</div>
        <span className="navbar-username">{user?.firstName || user?.username}</span>
        <button className="btn-outline logout-btn" onClick={logout}>
          Log out
        </button>
      </div>
    </nav>
  );
}
