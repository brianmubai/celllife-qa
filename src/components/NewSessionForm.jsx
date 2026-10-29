import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import { DEFAULT_BRANDING, BRAND_PRESETS, SESSION_STATUS } from '../models/types.js';
import SessionBanner from './SessionBanner.jsx';

export default function NewSessionForm({ onSessionCreated, onCancel }) {
  const [speakers, setSpeakers] = useState([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    // Default to today's date YYYY-MM-DD
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState([]);

  // Branding state
  const [branding, setBranding] = useState({
    primaryColor: DEFAULT_BRANDING.primaryColor,
    accentColor: DEFAULT_BRANDING.accentColor,
    emoji: DEFAULT_BRANDING.emoji,
    tagline: '',
    bannerUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch available speakers on mount
  useEffect(() => {
    const fetchSpeakers = async () => {
      setLoadingSpeakers(true);
      try {
        const res = await fetch(`${API_BASE}/speakers`);
        if (res.ok) {
          const data = await res.json();
          setSpeakers(data);
          // If speakers exist and none selected, pre-select the first one
          if (data.length > 0 && selectedSpeakerIds.length === 0) {
            setSelectedSpeakerIds([data[0].id]);
          }
        }
      } catch (err) {
        console.error('Failed to load speakers for session form', err);
      } finally {
        setLoadingSpeakers(false);
      }
    };
    fetchSpeakers();
  }, []);

  const handleSpeakerToggle = (speakerId) => {
    setSelectedSpeakerIds((prev) =>
      prev.includes(speakerId) ? prev.filter((id) => id !== speakerId) : [...prev, speakerId]
    );
  };

  const applyPreset = (presetName) => {
    const preset = BRAND_PRESETS[presetName];
    if (preset) {
      setBranding((prev) => ({
        ...prev,
        primaryColor: preset.primaryColor,
        accentColor: preset.accentColor,
        emoji: preset.emoji,
        tagline: preset.tagline || prev.tagline,
        bannerUrl: preset.bannerUrl || prev.bannerUrl,
      }));
    }
  };

  const handleBrandingChange = (field, value) => {
    setBranding((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Session title is required.');
      return;
    }

    if (!date) {
      setError('Session date is required.');
      return;
    }

    if (selectedSpeakerIds.length === 0) {
      setError('Please select at least one speaker for this session.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        date,
        speakerIds: selectedSpeakerIds,
        branding: {
          ...branding,
          bannerUrl: branding.bannerUrl.trim() || null,
        },
      };

      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      if (onSessionCreated) {
        onSessionCreated(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Construct live preview session object
  const previewSession = {
    id: 'preview',
    title: title.trim() || 'Session Title Preview',
    date: date || new Date().toISOString(),
    status: SESSION_STATUS.UPCOMING,
    branding,
  };

  return (
    <div className="new-session-form-container" id="new-session-form-wrapper">
      <div className="form-header-bar">
        <div>
          <h3>Create New Training Session</h3>
          <p className="form-subtitle">Schedule session, assign speakers, and customize branding.</p>
        </div>
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Live Session Banner Preview */}
      <div className="banner-preview-box">
        <div className="preview-label">Live Branding Preview</div>
        <SessionBanner session={previewSession} compact={false} />
      </div>

      <form onSubmit={handleSubmit} className="new-session-form">
        {/* Core Session Info */}
        <div className="form-section">
          <h4 className="section-heading">Session Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="session-title-input" className="form-label">
                Session Title *
              </label>
              <input
                id="session-title-input"
                type="text"
                maxLength={120}
                placeholder="e.g. Next-Gen Multi-Agent Systems in Production"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="session-date-input" className="form-label">
                Session Date *
              </label>
              <input
                id="session-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>
        </div>

        {/* Speaker Assignment */}
        <div className="form-section">
          <div className="label-row">
            <h4 className="section-heading">Assigned Speakers *</h4>
            <span className="form-hint">Select at least one</span>
          </div>

          {loadingSpeakers ? (
            <p className="text-muted">Loading registered speakers...</p>
          ) : speakers.length === 0 ? (
            <div className="alert alert-warning" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#EF4444', border: '1px solid rgba(220, 38, 38, 0.25)', padding: '0.75rem', borderRadius: '8px' }}>
              No speakers found. Please register speakers in the Speakers / Admin tab first.
            </div>
          ) : (
            <div className="speaker-checkbox-grid">
              {speakers.map((spk) => {
                const isChecked = selectedSpeakerIds.includes(spk.id);
                return (
                  <label
                    key={spk.id}
                    className={`speaker-checkbox-item ${isChecked ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleSpeakerToggle(spk.id)}
                      className="checkbox-input"
                    />
                    <div className="speaker-checkbox-info">
                      <strong className="speaker-checkbox-name">{spk.name}</strong>
                      <span className="speaker-checkbox-topic">{spk.topic}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Branding Fieldset */}
        <fieldset className="branding-fieldset">
          <legend className="branding-legend">Custom Branding & Theme</legend>

          {/* Presets Row */}
          <div className="branding-presets-row">
            <span className="presets-label">Style Presets:</span>
            <div className="preset-buttons">
              {Object.keys(BRAND_PRESETS).map((presetName) => (
                <button
                  key={presetName}
                  type="button"
                  className="btn btn-sm btn-outline preset-btn"
                  onClick={() => applyPreset(presetName)}
                >
                  <span
                    className="preset-color-dot"
                    style={{ backgroundColor: BRAND_PRESETS[presetName].primaryColor }}
                  />
                  {presetName}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="primary-color-input" className="form-label">
                Primary Color (Hex)
              </label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                  className="color-picker-input"
                />
                <input
                  id="primary-color-input"
                  type="text"
                  maxLength={7}
                  value={branding.primaryColor}
                  onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                  className="form-input"
                  placeholder="#DC2626"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="accent-color-input" className="form-label">
                Accent Color (Hex)
              </label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={branding.accentColor}
                  onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                  className="color-picker-input"
                />
                <input
                  id="accent-color-input"
                  type="text"
                  maxLength={7}
                  value={branding.accentColor}
                  onChange={(e) => handleBrandingChange('accentColor', e.target.value)}
                  className="form-input"
                  placeholder="#E5E7EB"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="branding-emoji-input" className="form-label">
                Emoji (Max 2 chars)
              </label>
              <input
                id="branding-emoji-input"
                type="text"
                maxLength={2}
                value={branding.emoji}
                onChange={(e) => handleBrandingChange('emoji', e.target.value)}
                className="form-input"
                placeholder="🏃"
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="branding-tagline-input" className="form-label">
                  Tagline (Max 120 chars)
                </label>
                <span className="char-count">{branding.tagline.length}/120</span>
              </div>
              <input
                id="branding-tagline-input"
                type="text"
                maxLength={120}
                value={branding.tagline}
                onChange={(e) => handleBrandingChange('tagline', e.target.value)}
                className="form-input"
                placeholder="e.g. Master modern agentic workflows"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="branding-banner-url" className="form-label">
                Banner Background Image URL (Must start with https://)
              </label>
              <input
                id="branding-banner-url"
                type="url"
                value={branding.bannerUrl}
                onChange={(e) => handleBrandingChange('bannerUrl', e.target.value)}
                className="form-input"
                placeholder="https://images.unsplash.com/photo-..."
              />
              <small className="form-hint">Optional: overrides gradient with image overlay.</small>
            </div>
          </div>
        </fieldset>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            id="submit-session-btn"
            disabled={submitting}
          >
            {submitting ? 'Creating Session...' : 'Create Session'}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
