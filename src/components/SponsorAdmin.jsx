import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import { SPONSOR_TIER, SPONSOR_LIMITS } from '../models/types.js';

export default function SponsorAdmin({ onSponsorUpdated }) {
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('qa_admin_token') || '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    tier: SPONSOR_TIER.SUPPORTING,
    logoUrl: '',
    websiteUrl: '',
    blurb: '',
    contactEmail: '',
  });

  const loadAdminSponsors = async (token) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/sponsors`, {
        headers: {
          'x-admin-token': token,
        },
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        setError('Unauthorized: Invalid admin token.');
        setSponsors([]);
        return;
      }

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setSponsors(data);
      setIsAuthenticated(true);
      localStorage.setItem('qa_admin_token', token);
    } catch (err) {
      setError(err.message || 'Failed to fetch admin sponsors.');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadAdminSponsors(adminToken);
    } else {
      setIsAuthenticated(false);
      setSponsors([]);
    }
  }, [adminToken]);

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
    setSponsors([]);
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
      tier: SPONSOR_TIER.SUPPORTING,
      logoUrl: '',
      websiteUrl: '',
      blurb: '',
      contactEmail: '',
    });
    setEditingId(null);
  };

  const startEdit = (sponsor) => {
    setEditingId(sponsor.id);
    setFormData({
      name: sponsor.name || '',
      tier: sponsor.tier || SPONSOR_TIER.SUPPORTING,
      logoUrl: sponsor.logoUrl || '',
      websiteUrl: sponsor.websiteUrl || '',
      blurb: sponsor.blurb || '',
      contactEmail: sponsor.contactEmail || '',
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim() || !formData.contactEmail.trim()) {
      setError('Name and a valid contact email are required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      tier: formData.tier,
      logoUrl: formData.logoUrl.trim() || null,
      websiteUrl: formData.websiteUrl.trim() || null,
      blurb: formData.blurb.trim(),
      contactEmail: formData.contactEmail.trim(),
    };

    try {
      const url = editingId
        ? `${API_BASE}/admin/sponsors/${editingId}`
        : `${API_BASE}/admin/sponsors`;
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
        throw new Error(responseData.error || 'Failed to save sponsor.');
      }

      setSuccess(editingId ? 'Sponsor updated successfully!' : 'Sponsor added successfully!');
      resetForm();
      loadAdminSponsors(adminToken);
      if (onSponsorUpdated) onSponsorUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete sponsor "${name}"?`)) {
      return;
    }
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/admin/sponsors/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken,
        },
      });

      const responseData = await res.json();
      if (res.status === 409) {
        setError(`Cannot delete sponsor "${name}": ${responseData.error}`);
        return;
      }

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to delete sponsor.');
      }

      setSuccess('Sponsor deleted successfully.');
      if (editingId === id) resetForm();
      loadAdminSponsors(adminToken);
      if (onSponsorUpdated) onSponsorUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-container" id="sponsor-admin-section">
      <div className="admin-header-card">
        <div className="admin-badge">Admin Workspace</div>
        <h2>Sponsor & Partner Management</h2>
        <p className="admin-subtitle">
          Manage session sponsors, tiers, logos, and private billing contact details.
        </p>

        {!isAuthenticated ? (
          <form onSubmit={handleSignIn} className="token-form">
            <label htmlFor="sponsor-admin-token-input" className="form-label">
              Admin Access Token
            </label>
            <div className="token-input-group">
              <input
                id="sponsor-admin-token-input"
                type="password"
                placeholder="Enter ADMIN_TOKEN (e.g., admin123)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="form-input"
                required
              />
              <button type="submit" className="btn btn-primary" id="sponsor-admin-sign-in-btn">
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
              id="sponsor-admin-sign-out-btn"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Add / Edit Sponsor Form */}
          <div className="admin-card form-card">
            <h3>{editingId ? 'Edit Sponsor' : 'Add New Sponsor'}</h3>
            <form onSubmit={handleSubmit} className="sponsor-form" id="sponsor-editor-form">
              <div className="form-grid">
                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="sponsor-name" className="form-label">
                      Organization Name *
                    </label>
                    <span className="char-count">
                      {formData.name.length}/{SPONSOR_LIMITS.name}
                    </span>
                  </div>
                  <input
                    id="sponsor-name"
                    name="name"
                    type="text"
                    maxLength={SPONSOR_LIMITS.name}
                    placeholder="e.g., CloudScale Systems"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sponsor-tier-select" className="form-label">
                    Default Tier *
                  </label>
                  <select
                    id="sponsor-tier-select"
                    name="tier"
                    value={formData.tier}
                    onChange={handleInputChange}
                    className="form-input form-select"
                  >
                    <option value={SPONSOR_TIER.TITLE}>🌟 Title Sponsor (Primary & Largest)</option>
                    <option value={SPONSOR_TIER.GOLD}>🥇 Gold Sponsor</option>
                    <option value={SPONSOR_TIER.SUPPORTING}>🤝 Supporting Partner</option>
                  </select>
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="sponsor-contact-email" className="form-label">
                      Contact Email * (Private / Admin Only)
                    </label>
                  </div>
                  <input
                    id="sponsor-contact-email"
                    name="contactEmail"
                    type="email"
                    placeholder="sponsorships@company.com"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <span className="form-hint">
                    Never displayed publicly or returned on public endpoints.
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="sponsor-logo-url" className="form-label">
                    Logo URL (HTTPS required)
                  </label>
                  <input
                    id="sponsor-logo-url"
                    name="logoUrl"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                  <span className="form-hint">Must start with https://</span>
                </div>

                <div className="form-group">
                  <label htmlFor="sponsor-website-url" className="form-label">
                    Website URL (HTTPS required)
                  </label>
                  <input
                    id="sponsor-website-url"
                    name="websiteUrl"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                  <span className="form-hint">Must start with https://</span>
                </div>

                <div className="form-group form-group-full">
                  <div className="label-row">
                    <label htmlFor="sponsor-blurb" className="form-label">
                      Tagline / Blurb
                    </label>
                    <span className="char-count">
                      {formData.blurb.length}/{SPONSOR_LIMITS.blurb}
                    </span>
                  </div>
                  <input
                    id="sponsor-blurb"
                    name="blurb"
                    type="text"
                    maxLength={SPONSOR_LIMITS.blurb}
                    placeholder="Brief 1-line organization overview"
                    value={formData.blurb}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" id="save-sponsor-btn">
                  {editingId ? 'Update Sponsor' : 'Add Sponsor'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Sponsors Table */}
          <div className="admin-card">
            <h3>Registered Sponsors ({sponsors.length})</h3>

            {loading ? (
              <div className="empty-state">
                <p>Loading sponsors...</p>
              </div>
            ) : sponsors.length === 0 ? (
              <div className="empty-state">
                <p>No sponsors registered yet. Use the form above to add one.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Sponsor</th>
                      <th>Tier</th>
                      <th>Contact Email (Admin Only)</th>
                      <th>Website</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsors.map((spk) => (
                      <tr key={spk.id} id={`sponsor-row-${spk.id}`}>
                        <td>
                          <div className="speaker-cell">
                            {spk.logoUrl ? (
                              <img
                                src={spk.logoUrl}
                                alt={spk.name}
                                style={{
                                  width: '42px',
                                  height: '42px',
                                  objectFit: 'contain',
                                  borderRadius: '6px',
                                  background: 'rgba(255,255,255,0.06)',
                                  padding: '2px',
                                }}
                              />
                            ) : (
                              <div className="avatar-placeholder">🏢</div>
                            )}
                            <div>
                              <strong>{spk.name}</strong>
                              {spk.blurb && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {spk.blurb}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`tier-badge tier-${spk.tier}`}>
                            {spk.tier.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <code>{spk.contactEmail}</code>
                        </td>
                        <td>
                          {spk.websiteUrl ? (
                            <a
                              href={spk.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-link"
                            >
                              Visit ↗
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>None</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => startEdit(spk)}
                            style={{ marginRight: '0.5rem' }}
                            id={`edit-sponsor-${spk.id}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(spk.id, spk.name)}
                            id={`delete-sponsor-${spk.id}`}
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
    </div>
  );
}
