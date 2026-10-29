import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import { SESSION_STATUS, SPONSOR_TIER } from '../models/types.js';

export default function SessionAdmin({ session, onBack, onSessionUpdated }) {
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('qa_admin_token') || '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [availableSponsors, setAvailableSponsors] = useState([]);
  const [selectedSponsorIds, setSelectedSponsorIds] = useState(() => {
    if (Array.isArray(session?.sponsorIds)) return session.sponsorIds;
    if (Array.isArray(session?.sponsors)) return session.sponsors.map((s) => s.id);
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isArchived = session?.status === SESSION_STATUS.ARCHIVED;

  // Check token
  useEffect(() => {
    if (adminToken) {
      setIsAuthenticated(true);
      fetchSponsors(adminToken);
    } else {
      setIsAuthenticated(false);
    }
  }, [adminToken]);

  const fetchSponsors = async (token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sponsors`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSponsors(data);
      }
    } catch (err) {
      console.error('Error fetching sponsors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setAdminToken(tokenInput.trim());
    localStorage.setItem('qa_admin_token', tokenInput.trim());
    setIsAuthenticated(true);
  };

  const toggleSponsor = (sponsorId) => {
    if (isArchived) return;
    setSelectedSponsorIds((prev) => {
      if (prev.includes(sponsorId)) {
        return prev.filter((id) => id !== sponsorId);
      } else {
        return [...prev, sponsorId];
      }
    });
  };

  const handleSaveSponsors = async (e) => {
    e.preventDefault();
    if (!session?.id) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/admin/sessions/${session.id}/sponsors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ sponsorIds: selectedSponsorIds }),
      });

      const data = await res.json();
      if (res.status === 409) {
        throw new Error(data.error || 'Cannot modify sponsors for an archived session.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update session sponsors.');
      }

      setSuccess(`Session sponsors updated successfully! Attached ${selectedSponsorIds.length} sponsor(s).`);
      if (onSessionUpdated) {
        onSessionUpdated(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="session-admin-container" id="session-editor-view">
      <div className="session-admin-header">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onBack}
          id="session-admin-back-btn"
        >
          ← Back to Sessions
        </button>
        <span className="archive-badge">Session Editor</span>
      </div>

      <div className="admin-card" style={{ marginTop: '1.25rem' }}>
        <div className="session-details-summary">
          <div className="details-header-row">
            <div>
              <h2 style={{ fontSize: '1.6rem', color: '#FFFFFF', marginBottom: '0.25rem' }}>
                {session?.title || 'Session Details'}
              </h2>
              <p className="admin-subtitle">
                Date: {session?.date ? new Date(session.date).toLocaleString() : 'N/A'} • Status:{' '}
                <span className={`status-badge status-${session?.status}`}>
                  {session?.status?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {session?.branding?.tagline && (
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              "{session.branding.tagline}"
            </p>
          )}

          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            Speakers:{' '}
            {session?.speakers && session.speakers.length > 0
              ? session.speakers.map((s) => s.name).join(', ')
              : 'None assigned'}
          </div>
        </div>
      </div>

      {/* Admin Authentication Required */}
      {!isAuthenticated ? (
        <div className="admin-card" style={{ marginTop: '1.5rem' }}>
          <h4>Admin Authentication Required</h4>
          <p className="admin-subtitle">
            Enter your admin token to modify session sponsors and configuration.
          </p>
          <form onSubmit={handleSignIn} className="token-form" style={{ marginTop: '1rem' }}>
            <div className="token-input-group">
              <input
                type="password"
                placeholder="Enter ADMIN_TOKEN (e.g. admin123)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="form-input"
                required
              />
              <button type="submit" className="btn btn-primary" id="session-admin-auth-btn">
                Authenticate
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="admin-card" style={{ marginTop: '1.5rem' }}>
          <div className="sponsor-picker-header">
            <div>
              <h3>Session Sponsors & Partners</h3>
              <p className="admin-subtitle">
                Select sponsors supporting this session. They will appear on the session banner, live
                screen, and post-session archive ordered by tier.
              </p>
            </div>
          </div>

          {isArchived && (
            <div className="alert alert-error" style={{ marginTop: '1rem' }}>
              ⚠️ This session is archived. Sponsors can only be modified while the session is upcoming or live.
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginTop: '1rem' }}>{success}</div>}

          {/* Sponsor Picker Checkboxes Form */}
          <form onSubmit={handleSaveSponsors} style={{ marginTop: '1.25rem' }}>
            {loading ? (
              <div className="empty-state">
                <p>Loading available sponsors...</p>
              </div>
            ) : availableSponsors.length === 0 ? (
              <div className="empty-state">
                <p>No sponsors registered in the system yet.</p>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  Add sponsors in the "Sponsors" tab first, then return here to attach them.
                </span>
              </div>
            ) : (
              <div className="sponsors-checkbox-grid">
                {availableSponsors.map((spk) => {
                  const isChecked = selectedSponsorIds.includes(spk.id);

                  return (
                    <label
                      key={spk.id}
                      className={`sponsor-checkbox-card ${isChecked ? 'selected' : ''} ${isArchived ? 'disabled' : ''}`}
                      id={`sponsor-pick-label-${spk.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSponsor(spk.id)}
                        disabled={isArchived}
                        id={`sponsor-checkbox-${spk.id}`}
                        className="sponsor-checkbox-input"
                      />
                      <div className="sponsor-card-body">
                        <div className="sponsor-card-top">
                          {spk.logoUrl ? (
                            <img
                              src={spk.logoUrl}
                              alt={spk.name}
                              className="sponsor-picker-thumb"
                            />
                          ) : (
                            <span className="avatar-placeholder">🏢</span>
                          )}
                          <span className={`tier-badge tier-${spk.tier}`}>
                            {spk.tier}
                          </span>
                        </div>
                        <strong className="sponsor-card-name">{spk.name}</strong>
                        {spk.blurb && (
                          <span className="sponsor-card-blurb">{spk.blurb}</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {!isArchived && availableSponsors.length > 0 && (
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  id="save-session-sponsors-btn"
                >
                  {saving ? 'Saving...' : `💾 Save Sponsors (${selectedSponsorIds.length} Selected)`}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onBack}
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
