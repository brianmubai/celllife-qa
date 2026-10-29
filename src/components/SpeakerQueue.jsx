import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';

export default function SpeakerQueue({
  sessionId,
  speakers = [],
  activeSpeaker = null,
  speakerPin = '',
  adminToken = '',
  onReplySent,
}) {
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(() => {
    if (activeSpeaker?.id && speakers.some((s) => s.id === activeSpeaker.id)) {
      return activeSpeaker.id;
    }
    return speakers.length > 0 ? speakers[0].id : '';
  });

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Per-question reply input state
  const [replyDrafts, setReplyDrafts] = useState({});
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [deliveryFeedback, setDeliveryFeedback] = useState({});

  const fetchQueue = async (spkId) => {
    if (!sessionId || !spkId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/sessions/${sessionId}/queue?speakerId=${encodeURIComponent(spkId)}`
      );
      if (!res.ok) {
        throw new Error(`Failed to load queue (${res.status})`);
      }
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      setError(err.message || 'Error fetching speaker queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSpeaker?.id && speakers.some((s) => s.id === activeSpeaker.id) && selectedSpeakerId !== activeSpeaker.id) {
      setSelectedSpeakerId(activeSpeaker.id);
    }
  }, [activeSpeaker, speakers]);

  useEffect(() => {
    if (selectedSpeakerId) {
      fetchQueue(selectedSpeakerId);
    } else if (speakers.length > 0) {
      setSelectedSpeakerId(speakers[0].id);
    }
  }, [sessionId, selectedSpeakerId, speakers]);

  const handleDraftChange = (qid, text) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [qid]: text,
    }));
  };

  const handleSendReply = async (question) => {
    const qid = question.id;
    const bodyText = (replyDrafts[qid] || '').trim();

    if (!bodyText) {
      alert('Please enter an answer before sending.');
      return;
    }

    setSubmittingIds((prev) => new Set([...prev, qid]));

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      const effectivePin = speakerPin || sessionStorage.getItem('celllife_speaker_pin');
      if (effectivePin) {
        headers['x-speaker-pin'] = effectivePin;
      }
      const effectiveAdminToken =
        adminToken ||
        sessionStorage.getItem('celllife_admin_token') ||
        localStorage.getItem('qa_admin_token');
      if (effectiveAdminToken) {
        headers['x-admin-token'] = effectiveAdminToken;
      }

      const res = await fetch(`${API_BASE}/sessions/${sessionId}/questions/${qid}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          speakerId: selectedSpeakerId,
          body: bodyText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }

      // Record delivery status returned by server
      let statusMsg = '';
      let isWarning = false;

      if (data.warning) {
        statusMsg = `⚠️ ${data.warning}`;
        isWarning = true;
      } else if (data.reply?.deliveredVia?.includes('email')) {
        statusMsg = '✓ Answer sent and emailed to asker!';
      } else {
        statusMsg = '✓ Answer saved (asker did not provide email).';
      }

      setDeliveryFeedback((prev) => ({
        ...prev,
        [qid]: { message: statusMsg, isWarning },
      }));

      // Clear draft
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[qid];
        return next;
      });

      // Refresh queue and parent list
      await fetchQueue(selectedSpeakerId);
      if (onReplySent) onReplySent(data);
    } catch (err) {
      setDeliveryFeedback((prev) => ({
        ...prev,
        [qid]: { message: `❌ Error: ${err.message}`, isWarning: true },
      }));
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(qid);
        return next;
      });
    }
  };

  const currentSpeaker = speakers.find((s) => s.id === selectedSpeakerId);

  return (
    <div className="speaker-queue-wrapper" id="speaker-queue-panel">
      <div className="queue-header-box">
        <div className="queue-identity-select-row">
          <div>
            <span className="queue-badge">🎙️ Speaker Workspace</span>
            <h3 className="queue-title">Your Question Queue</h3>
            <p className="queue-subtitle">
              Review and answer questions submitted for you or the open panel.
            </p>
          </div>

          <div className="speaker-selector-group">
            <label htmlFor="speaker-queue-picker" className="form-label">
              Operating As:
            </label>
            <select
              id="speaker-queue-picker"
              value={selectedSpeakerId}
              onChange={(e) => setSelectedSpeakerId(e.target.value)}
              className="form-input form-select"
            >
              {speakers.map((spk) => (
                <option key={spk.id} value={spk.id}>
                  👤 {spk.name} ({spk.topic})
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentSpeaker && (
          <div className="current-speaker-strip">
            <span className="strip-topic">Topic: <strong>{currentSpeaker.topic}</strong></span>
            <span className="strip-count">Open Questions: <strong>{queue.length}</strong></span>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <p>Loading questions for your queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '2rem' }}>🎉</span>
          <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>Queue is clear!</p>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            All questions addressed to you or the open panel have been answered.
          </span>
        </div>
      ) : (
        <div className="queue-cards-stack">
          {queue.map((item) => {
            const draft = replyDrafts[item.id] || '';
            const isSubmitting = submittingIds.has(item.id);
            const feedback = deliveryFeedback[item.id];

            return (
              <div key={item.id} className="queue-question-card" id={`queue-item-${item.id}`}>
                <div className="queue-question-meta">
                  <div className="meta-left">
                    <span
                      className={`speaker-target-tag ${item.speakerId ? 'speaker-specific' : 'speaker-any'}`}
                    >
                      {item.speakerId ? '👤 Addressed directly to You' : '🎯 Addressed to Any Speaker'}
                    </span>
                    <span className="upvote-pill">▲ {item.upvotes} upvotes</span>
                  </div>

                  <span className="asker-tag">
                    {item.askerName ? `From ${item.askerName}` : 'From Anonymous'}
                  </span>
                </div>

                <p className="queue-question-body">{item.body}</p>

                {feedback && (
                  <div
                    className={`alert ${feedback.isWarning ? 'alert-error' : 'alert-success'}`}
                    style={{ margin: '0.75rem 0' }}
                  >
                    {feedback.message}
                  </div>
                )}

                <div className="reply-composer-box">
                  <div className="label-row">
                    <label htmlFor={`reply-input-${item.id}`} className="form-label">
                      Your Answer
                    </label>
                    <span className="char-count">{draft.length}/2000</span>
                  </div>
                  <textarea
                    id={`reply-input-${item.id}`}
                    rows="3"
                    maxLength={2000}
                    placeholder="Type your official answer here (will be emailed to asker and archived)..."
                    value={draft}
                    onChange={(e) => handleDraftChange(item.id, e.target.value)}
                    className="form-textarea"
                  />

                  <div className="reply-actions-row">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSendReply(item)}
                      disabled={isSubmitting || !draft.trim()}
                      id={`send-reply-btn-${item.id}`}
                    >
                      {isSubmitting ? 'Sending Answer...' : '🚀 Send Answer'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
