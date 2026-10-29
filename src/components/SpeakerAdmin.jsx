import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import { SPEAKER_LIMITS } from '../models/types.js';
import SessionCloseOutAdmin from './SessionCloseOutAdmin.jsx';

export default function SpeakerAdmin({ onSpeakerUpdated, adminToken: externalAdminToken = '' }) {
  const [adminToken, setAdminToken] = useState(() => {
    return (
      externalAdminToken ||
      sessionStorage.getItem('celllife_admin_token') ||
      localStorage.getItem('qa_admin_token') ||
      ''
    );
  });
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('speakers'); // 'speakers' | 'closeout'

  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing & Invitation state
  const [editingId, setEditingId] = useState(null);
  const [assignedSpeakerIds, setAssignedSpeakerIds] = useState(new Set());
  const [showPinInput, setShowPinInput] = useState(false);
  const [revealedPins, setRevealedPins] = useState({});
  const [selectedInviteSpeaker, setSelectedInviteSpeaker] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    topic: '',
    bio: '',
    photoUrl: '',
    email: '',
    pin: '1234',
  });

  const getSpeakerInvitationText = (spk) => {
    if (!spk) return '';
    const portalUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/speaker`
        : 'https://cellife.co.zw/speaker';
    return `🎙️ cellLife Conference - Speaker Login Credentials

Hello ${spk.name},
You are registered as an official speaker for the upcoming conference!

📌 Topic: ${spk.topic || 'General Session'}
🌐 Speaker Login Portal: ${portalUrl}
🔑 Your Secret PIN: ${spk.pin || '1234'}

Quick Steps to Answer Questions:
1. Open the portal link above on your phone, tablet, or laptop.
2. Select your name from the list and enter your 4-digit PIN.
3. You will immediately see questions asked by the congregation and can reply live!`;
  };

  // Sync with external admin token if updated
  useEffect(() => {
    if (externalAdminToken && externalAdminToken !== adminToken) {
      setAdminToken(externalAdminToken);
    }
  }, [externalAdminToken]);

  // Verify token on mount or token change
  useEffect(() => {
    if (adminToken) {
      loadAdminSpeakers(adminToken);
    } else {
      setIsAuthenticated(false);
      setSpeakers([]);
    }
  }, [adminToken]);

  const loadAdminSpeakers = async (token) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/speakers`, {
        headers: {
          'x-admin-token': token,
        },
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        setError('Unauthorized: Invalid admin token.');
        setSpeakers([]);
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setSpeakers(data);
      setIsAuthenticated(true);
      localStorage.setItem('qa_admin_token', token);
    } catch (err) {
      setError(err.message || 'Failed to fetch admin speakers.');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setAdminToken(tokenInput.trim());
  };

  const handleSignOut = () => {
    localStorage.removeItem('qa_admin_token');
    setAdminToken('');
    setTokenInput('');
    setIsAuthenticated(false);
    setSpeakers([]);
    setEditingId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      topic: '',
      bio: '',
      photoUrl: '',
      email: '',
      pin: '1234',
    });
    setShowPinInput(false);
    setEditingId(null);
  };

  const startEdit = (speaker) => {
    setEditingId(speaker.id);
    setFormData({
      name: speaker.name || '',
      title: speaker.title || '',
      topic: speaker.topic || '',
      bio: speaker.bio || '',
      photoUrl: speaker.photoUrl || '',
      email: speaker.email || '',
      pin: speaker.pin || '1234',
    });
    setShowPinInput(false);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side quick check
    if (!formData.name.trim() || !formData.topic.trim() || !formData.email.trim()) {
      setError('Name, topic, and a valid email are required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      title: formData.title.trim(),
      topic: formData.topic.trim(),
      bio: formData.bio.trim(),
      email: formData.email.trim(),
      pin: formData.pin.trim() || '1234',
      photoUrl: formData.photoUrl.trim() || null,
    };

    try {
      const url = editingId
        ? `${API_BASE}/admin/speakers/${editingId}`
        : `${API_BASE}/admin/speakers`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to save speaker.');
      }

      const wasCreating = !editingId;
      setSuccess(
        editingId ? 'Speaker updated successfully!' : 'Speaker added successfully! Ready to share credentials.'
      );
      resetForm();
      loadAdminSpeakers(adminToken);
      if (onSpeakerUpdated) onSpeakerUpdated();

      if (wasCreating) {
        setSelectedInviteSpeaker({
          name: payload.name,
          topic: payload.topic,
          pin: payload.pin,
          email: payload.email,
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete speaker "${name}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/admin/speakers/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken,
        },
      });

      const responseData = await res.json();

      if (res.status === 409) {
        setError(responseData.error || 'Cannot delete speaker assigned to a session (409 Conflict).');
        return;
      }

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to delete speaker.');
      }

      setSuccess('Speaker deleted successfully.');
      if (editingId === id) resetForm();
      loadAdminSpeakers(adminToken);
      if (onSpeakerUpdated) onSpeakerUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignToSession = async (speakerId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/test-session/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ speakerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign session');
      setAssignedSpeakerIds((prev) => new Set([...prev, speakerId]));
      setSuccess('Speaker assigned to a session. Trying to delete will now produce 409 Conflict.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnassignFromSession = async (speakerId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/test-session/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ speakerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear session');
      setAssignedSpeakerIds((prev) => {
        const next = new Set(prev);
        next.delete(speakerId);
        return next;
      });
      setSuccess('Speaker unassigned from session. Now eligible for deletion.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-container" id="speaker-admin-section">
      <div className="admin-header-card">
        <div className="admin-badge">Admin Workspace</div>
        <h2>Speaker Management</h2>
        <p className="admin-subtitle">
          Configure speaker profiles, emails, and session participation.
        </p>

        {!isAuthenticated ? (
          <form onSubmit={handleSignIn} className="token-form">
            <label htmlFor="admin-token-input" className="form-label">
              Admin Access Token
            </label>
            <div className="token-input-group">
              <div className="password-input-wrapper" style={{ flex: 1 }}>
                <input
                  id="admin-token-input"
                  type={showTokenInput ? 'text' : 'password'}
                  placeholder="Enter ADMIN_TOKEN (e.g., admin123)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowTokenInput((prev) => !prev)}
                  title={showTokenInput ? 'Hide Passcode' : 'Show Passcode'}
                  aria-label={showTokenInput ? 'Hide Passcode' : 'Show Passcode'}
                >
                  {showTokenInput ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <button type="submit" className="btn btn-primary" id="admin-sign-in-btn">
                Authenticate
              </button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
          </form>
        ) : (
          <div className="auth-status-bar">
            <div className="auth-badge">
              <span className="status-dot"></span> Authenticated as Administrator
            </div>
            <button
              onClick={handleSignOut}
              className="btn btn-outline-danger"
              id="admin-sign-out-btn"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <>
          {/* Admin Workspace Sub-navigation */}
          <div className="admin-subnav-pills" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeAdminTab === 'speakers' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveAdminTab('speakers')}
              id="admin-tab-speakers-btn"
            >
              🎙️ Speaker Profiles
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeAdminTab === 'closeout' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveAdminTab('closeout')}
              id="admin-tab-closeout-btn"
            >
              🔒 Post-Session Close-Out
            </button>
          </div>

          {activeAdminTab === 'closeout' ? (
            <SessionCloseOutAdmin adminToken={adminToken} />
          ) : (
            <>
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {/* Add / Edit Speaker Form */}
              <div className="admin-card form-card">
                <h3>{editingId ? 'Edit Speaker' : 'Add New Speaker'}</h3>
            <form onSubmit={handleSubmit} className="speaker-form" id="speaker-editor-form">
              <div className="form-grid">
                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="speaker-name" className="form-label">
                      Full Name *
                    </label>
                    <span className="char-count">
                      {formData.name.length}/{SPEAKER_LIMITS.name}
                    </span>
                  </div>
                  <input
                    id="speaker-name"
                    name="name"
                    type="text"
                    maxLength={SPEAKER_LIMITS.name}
                    placeholder="e.g. Dr. Jane Smith"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="speaker-email" className="form-label">
                      Email Address * <span className="confidential-tag">(Admin Only)</span>
                    </label>
                  </div>
                  <input
                    id="speaker-email"
                    name="email"
                    type="email"
                    placeholder="e.g. jane.smith@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="speaker-pin" className="form-label">
                      Speaker PIN * <span className="confidential-tag">(Private)</span>
                    </label>
                  </div>
                  <div className="password-input-wrapper">
                    <input
                      id="speaker-pin"
                      name="pin"
                      type={showPinInput ? 'text' : 'password'}
                      placeholder="e.g. 1234"
                      value={formData.pin}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPinInput((prev) => !prev)}
                      title={showPinInput ? 'Hide PIN' : 'Show PIN'}
                      aria-label={showPinInput ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showPinInput ? '🙈 Hide' : '👁️ Show'}
                    </button>
                  </div>
                  <small className="form-hint">
                    Private login & reply PIN. Speaker can recover this PIN anytime via email.
                  </small>
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="speaker-title" className="form-label">
                      Professional Title
                    </label>
                    <span className="char-count">
                      {formData.title.length}/{SPEAKER_LIMITS.title}
                    </span>
                  </div>
                  <input
                    id="speaker-title"
                    name="title"
                    type="text"
                    maxLength={SPEAKER_LIMITS.title}
                    placeholder="e.g. Principal AI Researcher"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="speaker-topic" className="form-label">
                      Presentation Topic *
                    </label>
                    <span className="char-count">
                      {formData.topic.length}/{SPEAKER_LIMITS.topic}
                    </span>
                  </div>
                  <input
                    id="speaker-topic"
                    name="topic"
                    type="text"
                    maxLength={SPEAKER_LIMITS.topic}
                    placeholder="e.g. Machine Learning Systems in Production"
                    value={formData.topic}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="speaker-photo" className="form-label">
                    Photo URL (must start with https://)
                  </label>
                  <input
                    id="speaker-photo"
                    name="photoUrl"
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.photoUrl}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    If not starting with https://, it will be set to null.
                  </small>
                </div>

                <div className="form-group full-width">
                  <div className="label-row">
                    <label htmlFor="speaker-bio" className="form-label">
                      Biography
                    </label>
                    <span className="char-count">
                      {formData.bio.length}/{SPEAKER_LIMITS.bio}
                    </span>
                  </div>
                  <textarea
                    id="speaker-bio"
                    name="bio"
                    maxLength={SPEAKER_LIMITS.bio}
                    rows="4"
                    placeholder="Short professional biography..."
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="form-textarea"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" id="save-speaker-btn">
                  {editingId ? 'Update Speaker' : 'Save Speaker'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-secondary"
                    id="cancel-edit-btn"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Admin Speaker List */}
          <div className="admin-card list-card">
            <div className="list-card-header">
              <h3>Registered Speakers ({speakers.length})</h3>
              {loading && <span className="loading-badge">Refreshing...</span>}
            </div>

            {speakers.length === 0 ? (
              <div className="empty-state">
                <p>No speakers registered yet. Add your first speaker above.</p>
              </div>
            ) : (
              <div className="speakers-table-wrap">
                <table className="speakers-table">
                  <thead>
                    <tr>
                      <th>Speaker</th>
                      <th>Topic</th>
                      <th>Email (Admin Only)</th>
                      <th>PIN</th>
                      <th>Session Status</th>
                      <th>Photo</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {speakers.map((spk) => (
                      <tr key={spk.id} id={`speaker-row-${spk.id}`}>
                        <td>
                          <div className="table-speaker-cell">
                            <strong>{spk.name}</strong>
                            {spk.title && <span className="table-sub">{spk.title}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="topic-pill">{spk.topic}</span>
                        </td>
                        <td>
                          <code className="email-cell">{spk.email}</code>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <code
                              className="email-cell"
                              style={{
                                letterSpacing: revealedPins[spk.id] ? 'normal' : '0.15em',
                                minWidth: '42px',
                                display: 'inline-block',
                                textAlign: 'center',
                              }}
                            >
                              {revealedPins[spk.id] ? (spk.pin || '1234') : '••••'}
                            </code>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem', lineHeight: 1 }}
                              onClick={() =>
                                setRevealedPins((prev) => ({ ...prev, [spk.id]: !prev[spk.id] }))
                              }
                              title={revealedPins[spk.id] ? 'Hide PIN' : 'Show PIN'}
                              aria-label={revealedPins[spk.id] ? 'Hide PIN' : 'Show PIN'}
                            >
                              {revealedPins[spk.id] ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </td>
                        <td>
                          {assignedSpeakerIds.has(spk.id) ? (
                            <span style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#EF4444', border: '1px solid rgba(220, 38, 38, 0.3)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                              Assigned to Session
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          {spk.photoUrl ? (
                            <a
                              href={spk.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="photo-link"
                            >
                              View URL
                            </a>
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </td>
                        <td className="actions-cell">
                          {assignedSpeakerIds.has(spk.id) ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleUnassignFromSession(spk.id)}
                              title="Unassign speaker from session"
                            >
                              Unassign
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleAssignToSession(spk.id)}
                              title="Assign speaker to session (tests 409 Conflict)"
                            >
                              Assign Session
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setSelectedInviteSpeaker(spk);
                              setInviteCopied(false);
                            }}
                            id={`share-speaker-${spk.id}`}
                            style={{ color: '#0284c7', borderColor: '#38bdf8', fontWeight: 600 }}
                            title="View and copy shareable login text for this speaker"
                          >
                            📋 Share PIN
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => startEdit(spk)}
                            id={`edit-speaker-${spk.id}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(spk.id, spk.name)}
                            id={`delete-speaker-${spk.id}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      </>
    )}
  </>
)}

      {/* Speaker Invitation / Credentials Modal */}
      {selectedInviteSpeaker && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedInviteSpeaker(null)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '540px',
              width: '92%',
              padding: '1.75rem',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                🎙️ Speaker Login Credentials
              </h3>
              <button
                type="button"
                onClick={() => setSelectedInviteSpeaker(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: '#64748b' }}>
              Share these credentials with <strong>{selectedInviteSpeaker.name}</strong> via WhatsApp, SMS, or Email:
            </p>

            <textarea
              readOnly
              rows={11}
              value={getSpeakerInvitationText(selectedInviteSpeaker)}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                lineHeight: '1.5',
                background: '#f8fafc',
                color: '#1e293b',
                resize: 'none',
                boxSizing: 'border-box',
                marginBottom: '1.25rem',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.82rem',
                  color: inviteCopied ? '#10b981' : '#64748b',
                  fontWeight: 600,
                }}
              >
                {inviteCopied ? '✓ Copied to clipboard!' : 'Ready to send to speaker'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  style={{
                    background: inviteCopied ? '#10b981' : '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      getSpeakerInvitationText(selectedInviteSpeaker)
                    );
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2500);
                  }}
                >
                  {inviteCopied ? '✓ Copied!' : '📋 Copy Invitation Message'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    background: '#ffffff',
                  }}
                  onClick={() => setSelectedInviteSpeaker(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
