import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [persona, setPersona] = useState('');

  useEffect(() => {
    apiFetch('/api/account/profile')
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhone(data.phone || '');
        setPersona(data.persona || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setEditing(true);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditing(false);
    setFirstName(profile?.firstName || '');
    setLastName(profile?.lastName || '');
    setPhone(profile?.phone || '');
    setPersona(profile?.persona || '');
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName, phone, persona }),
      });
      setProfile((p) => ({ ...p, firstName, lastName, phone, persona }));
      setEditing(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const initials =
    (profile?.firstName?.[0] || '') + (profile?.lastName?.[0] || profile?.email?.[0] || '');

  return (
    <div className="profile-page">
      {/* ── Header ── */}
      <div className="profile-header-card card">
        <div className="profile-avatar-large">{initials.toUpperCase()}</div>
        <div className="profile-header-info">
          <h1 className="profile-name">
            {profile?.firstName} {profile?.lastName}
          </h1>
          <p className="profile-email">{profile?.email}</p>
          {profile?.persona && (
            <span className="badge badge-info">{profile.persona}</span>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ── Profile Information ── */}
      <div className="card profile-section">
        <div className="profile-section-header">
          <div>
            <h2 className="profile-section-title">Profile Information</h2>
            <p className="profile-section-desc">Manage your basic information</p>
          </div>
          {!editing && (
            <button className="btn-outline" onClick={startEdit}>Edit</button>
          )}
        </div>

        <div className="profile-fields">
          <ProfileField
            label="First name"
            value={firstName}
            editing={editing}
            onChange={setFirstName}
          />
          <ProfileField
            label="Last name"
            value={lastName}
            editing={editing}
            onChange={setLastName}
          />
          <ProfileField
            label="Email"
            value={profile?.email}
            readOnly
          />
          <ProfileField
            label="Username"
            value={profile?.username}
            readOnly
          />
        </div>
      </div>

      {/* ── Account Attributes ── */}
      <div className="card profile-section">
        <div className="profile-section-header">
          <div>
            <h2 className="profile-section-title">Account Attributes</h2>
          </div>
        </div>

        <div className="profile-fields">
          <ProfileField
            label="Phone"
            value={phone}
            editing={editing}
            onChange={setPhone}
          />
          <ProfileField
            label="Persona"
            value={persona}
            editing={editing}
            onChange={setPersona}
          />
        </div>

        {editing && (
          <div className="profile-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-outline" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({ label, value, editing, onChange, readOnly }) {
  return (
    <div className="profile-field">
      <label className="profile-field-label">{label}</label>
      {editing && !readOnly ? (
        <input
          className="profile-field-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="profile-field-value">
          {value || <span className="not-set">—</span>}
          {readOnly && <span className="read-only-badge">Read-only</span>}
        </div>
      )}
    </div>
  );
}
