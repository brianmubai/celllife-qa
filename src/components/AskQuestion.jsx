import React, { useState } from 'react';
import { API_BASE } from '../config.js';
import { ANY_SPEAKER } from '../models/types.js';

export default function AskQuestion({ sessionId, speakers = [], onQuestionSubmitted, isArchived = false }) {
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');
  const [body, setBody] = useState('');
  const [askerName, setAskerName] = useState('');
  const [email, setEmail] = useState('');
  const [archive, setArchive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isArchived) {
      setError('This session is archived. New questions are no longer accepted.');
      return;
    }

    if (!body.trim()) {
      setError('Question text is required.');
      return;
    }

    if (body.trim().length > 500) {
      setError('Question exceeds the 500-character maximum limit.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        speakerId: selectedSpeakerId ? selectedSpeakerId : ANY_SPEAKER,
        body: body.trim(),
        askerName: askerName.trim() || null,
        email: email.trim() || null,
        archive,
      };

      const res = await fetch(`${API_BASE}/sessions/${sessionId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit question');
      }

      setSuccess('Your question has been submitted successfully!');
      setBody('');
      // Leave name/email in case participant asks more questions

      if (onQuestionSubmitted) {
        onQuestionSubmitted(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isArchived) {
    return (
      <div className="ask-question-box ask-question-disabled">
        <div className="archive-notice">
          <span className="notice-icon">🔒</span>
          <div>
            <strong>Session Archived</strong>
            <p>This session is now read-only. Questions and upvoting are closed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ask-question-box" id="ask-question-form-container">
      <div className="ask-box-header">
        <h3 className="ask-box-title">Ask a Question</h3>
        <span className="ask-box-subtitle">
          Submit a question for session speakers or the open panel.
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="ask-question-form">
        <div className="form-group">
          <label htmlFor="speaker-select" className="form-label">
            Direct Question To
          </label>
          <select
            id="speaker-select"
            value={selectedSpeakerId}
            onChange={(e) => setSelectedSpeakerId(e.target.value)}
            className="form-input form-select"
          >
            <option value="">🎯 Any Speaker (Open Panel)</option>
            {speakers.map((spk) => (
              <option key={spk.id} value={spk.id}>
                👤 {spk.name} ({spk.topic})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <div className="label-row">
            <label htmlFor="question-body-input" className="form-label">
              Your Question *
            </label>
            <span className="char-count">{body.length}/500</span>
          </div>
          <textarea
            id="question-body-input"
            rows="3"
            maxLength={500}
            placeholder="Type your question clearly and concisely..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="form-textarea"
            required
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="asker-name-input" className="form-label">
              Your Name <span className="optional-tag">(Optional)</span>
            </label>
            <input
              id="asker-name-input"
              type="text"
              placeholder="e.g. Alex Jordan (or leave anonymous)"
              value={askerName}
              onChange={(e) => setAskerName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="asker-email-input" className="form-label">
              Your Email <span className="optional-tag">(Optional)</span>
            </label>
            <input
              id="asker-email-input"
              type="email"
              placeholder="e.g. alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
            <small className="form-hint email-note">
              ℹ️ Your answer will be emailed to this address. (Never displayed publicly).
            </small>
          </div>
        </div>

        <div className="form-group checkbox-group">
          <label className="custom-checkbox-label">
            <input
              type="checkbox"
              checked={archive}
              onChange={(e) => setArchive(e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-text">
              Share this question and answer in the public archive
            </span>
          </label>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            id="submit-question-btn"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Question'}
          </button>
        </div>
      </form>
    </div>
  );
}
