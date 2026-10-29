import React, { useState } from 'react';
import { API_BASE } from '../config.js';

export default function RoleAccessModal({
  isOpen,
  onClose,
  speakers = [],
  onLoginAsSpeaker,
  onLoginAsAdmin,
  initialTab = 'speaker',
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'speaker' | 'admin'
  const [adminUsername, setAdminUsername] = useState('admin');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(() => {
    return speakers.length > 0 ? speakers[0].id : '';
  });
  const [speakerPin, setSpeakerPin] = useState('');
  const [showSpeakerPin, setShowSpeakerPin] = useState(false);

  const [adminToken, setAdminToken] = useState('');
  const [showAdminToken, setShowAdminToken] = useState(false);

  // Sync activeTab when modal opens or initialTab changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setError('');
      setIsForgotPinMode(false);
    }
  }, [isOpen, initialTab]);

  // Forgot PIN sub-view state
  const [isForgotPinMode, setIsForgotPinMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSpeakerSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const spkId = selectedSpeakerId || (speakers.length > 0 ? speakers[0].id : '');
    if (!spkId) {
      setError('Please select a speaker profile.');
      return;
    }

    if (!speakerPin.trim()) {
      setError('Please enter your secret Speaker PIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/speakers/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakerId: spkId,
          pin: speakerPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect speaker PIN.');
      }

      onLoginAsSpeaker(data.speaker, speakerPin.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRecoverySuccess('');

    if (!recoveryEmail.trim()) {
      setError('Please enter your registered speaker email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/speakers/forgot-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch recovery PIN.');
      }

      setRecoverySuccess(data.message);
    } catch (err) {
      setError(err.message || 'Error requesting PIN recovery.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const token = adminToken.trim();

    if (!token) {
      setError('Please enter the administrator passcode.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/speakers`, {
        headers: {
          'x-admin-token': token,
        },
      });

      if (!res.ok) {
        throw new Error('Invalid administrator passcode.');
      }

      onLoginAsAdmin(token);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card role-access-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="modal-icon">🔐</span>
            <div>
              <h3>Staff & Speaker Access</h3>
              <p className="modal-subtitle">
                Secure access for verified speakers and event administrators.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: Speaker vs Admin */}
        <div className="role-modal-tabs">
          <button
            type="button"
            className={`role-tab-btn ${activeTab === 'speaker' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('speaker');
              setIsForgotPinMode(false);
              setError('');
              setRecoverySuccess('');
            }}
          >
            🎙️ Speaker Portal
          </button>
          <button
            type="button"
            className={`role-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin');
              setIsForgotPinMode(false);
              setError('');
              setRecoverySuccess('');
            }}
          >
            🛡️ Administrator
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ margin: '1rem 1.75rem 0' }}>{error}</div>}
        {recoverySuccess && (
          <div className="alert alert-success" style={{ margin: '1rem 1.75rem 0', color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.75rem', borderRadius: '8px' }}>
            ✓ {recoverySuccess}
          </div>
        )}

        {/* Speaker Login Panel */}
        {activeTab === 'speaker' && !isForgotPinMode && (
          <form onSubmit={handleSpeakerSubmit} className="role-modal-form">
            <div className="form-group">
              <label htmlFor="speaker-select">Select Speaker Persona:</label>
              <select
                id="speaker-select"
                className="form-control"
                value={selectedSpeakerId || (speakers[0]?.id || '')}
                onChange={(e) => setSelectedSpeakerId(e.target.value)}
              >
                {speakers.map((spk) => (
                  <option key={spk.id} value={spk.id}>
                    {spk.name} ({spk.topic || 'Speaker'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="speaker-pin-input">Speaker PIN:</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  onClick={() => {
                    setIsForgotPinMode(true);
                    setError('');
                    setRecoverySuccess('');
                  }}
                  id="forgot-speaker-pin-link"
                >
                  Forgot PIN?
                </button>
              </div>

              <div className="password-input-wrapper">
                <input
                  type={showSpeakerPin ? 'text' : 'password'}
                  id="speaker-pin-input"
                  className="form-control"
                  placeholder="Enter your secret speaker PIN"
                  value={speakerPin}
                  onChange={(e) => setSpeakerPin(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowSpeakerPin((prev) => !prev)}
                  title={showSpeakerPin ? 'Hide PIN' : 'Show PIN'}
                  aria-label={showSpeakerPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showSpeakerPin ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <span className="form-hint">
                Default PIN for sample speaker is <code>1234</code>.
              </span>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                id="enter-speaker-mode-btn"
                disabled={loading}
              >
                {loading ? 'Verifying PIN...' : '🎙️ Verify & Enter Speaker Mode'}
              </button>
            </div>
          </form>
        )}

        {/* Forgot PIN Recovery View */}
        {activeTab === 'speaker' && isForgotPinMode && (
          <form onSubmit={handleForgotPinSubmit} className="role-modal-form">
            <div className="form-group">
              <label htmlFor="recovery-email-input">Speaker Registered Email:</label>
              <input
                type="email"
                id="recovery-email-input"
                className="form-control"
                placeholder="e.g. speaker@celllife.org"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                autoFocus
                required
              />
              <span className="form-hint">
                Enter your registered speaker email. We will dispatch your secret PIN to your inbox.
              </span>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsForgotPinMode(false);
                  setError('');
                }}
                disabled={loading}
              >
                ← Back to Login
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                id="send-recovery-pin-btn"
                disabled={loading}
              >
                {loading ? 'Sending...' : '📨 Send My PIN'}
              </button>
            </div>
          </form>
        )}

        {/* Admin Login Panel */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="role-modal-form">
            <div className="form-group">
              <label htmlFor="admin-username-input">Administrator Username:</label>
              <input
                type="text"
                id="admin-username-input"
                className="form-control"
                placeholder="admin"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-passcode-input">Administrator Passcode / Password:</label>
              <div className="password-input-wrapper">
                <input
                  type={showAdminToken ? 'text' : 'password'}
                  id="admin-passcode-input"
                  className="form-control"
                  placeholder="admin123"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowAdminToken((prev) => !prev)}
                  title={showAdminToken ? 'Hide Passcode' : 'Show Passcode'}
                  aria-label={showAdminToken ? 'Hide Passcode' : 'Show Passcode'}
                >
                  {showAdminToken ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <span className="form-hint" style={{ marginTop: '0.4rem', display: 'block' }}>
                Default Event Credentials: Username <code>admin</code> · Passcode <code>admin123</code>
              </span>
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                id="unlock-admin-btn"
                disabled={loading}
              >
                {loading ? 'Verifying...' : '🛡️ Unlock Admin Suite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
