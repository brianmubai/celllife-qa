import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import { SESSION_STATUS, QUESTION_STATUS } from '../models/types.js';

export default function SessionCloseOutAdmin({ adminToken }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Close-out result state
  const [closedSession, setClosedSession] = useState(null);
  const [unansweredList, setUnansweredList] = useState([]);
  const [notifyingEmail, setNotifyingEmail] = useState(false);
  const [emailNotificationResult, setEmailNotificationResult] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`);
      const data = await res.json();
      const allSessions = [...(data.active || []), ...(data.past || [])];
      setSessions(allSessions);
    } catch (err) {
      setError(err.message || 'Error fetching sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  /**
   * Close session: calls advance and close-out together, then shows the unanswered list.
   */
  const handleCloseSession = async (session) => {
    setError('');
    setSuccess('');
    setEmailNotificationResult(null);
    setActionLoadingId(session.id);

    try {
      let currentStatus = session.status;

      // 1. Advance to archived if not yet archived
      if (currentStatus === SESSION_STATUS.UPCOMING) {
        // Advance upcoming -> live
        const advLiveRes = await fetch(`${API_BASE}/sessions/${session.id}/advance`, {
          method: 'POST',
        });
        if (advLiveRes.ok) {
          currentStatus = SESSION_STATUS.LIVE;
        }
      }

      if (currentStatus === SESSION_STATUS.LIVE) {
        // Advance live -> archived
        const advArchRes = await fetch(`${API_BASE}/sessions/${session.id}/advance`, {
          method: 'POST',
        });
        if (!advArchRes.ok) {
          const advData = await advArchRes.json();
          console.warn('Advance to archive warning:', advData.error);
        }
      }

      // 2. Call POST /sessions/:id/close-out (admin only)
      const closeRes = await fetch(`${API_BASE}/sessions/${session.id}/close-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
      });

      if (!closeRes.ok) {
        const closeData = await closeRes.json();
        throw new Error(closeData.error || 'Failed to close out session.');
      }

      const closedQuestions = await closeRes.json();
      setClosedSession(session);
      setUnansweredList(closedQuestions);
      setSuccess(
        `Session "${session.title}" was closed and archived successfully! Marked ${closedQuestions.length} remaining open question(s) as unanswered.`
      );

      // Refresh sessions list
      await fetchSessions();
    } catch (err) {
      setError(err.message || 'Error executing session close-out');
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Optional: Email each asker with a link to the archive page.
   * Only send to askers who gave an email and opted in to the archive.
   */
  const handleNotifyArchive = async (sessionId) => {
    setNotifyingEmail(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/notify-archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch archive notification emails');
      }

      setEmailNotificationResult(data);
      setSuccess(
        `📧 Archive notifications dispatched! Successfully emailed ${data.notifiedCount} eligible participant(s) who opted in.`
      );
    } catch (err) {
      setError(err.message || 'Error dispatching archive emails');
    } finally {
      setNotifyingEmail(false);
    }
  };

  return (
    <div className="session-closeout-admin" id="session-closeout-admin-wrapper">
      <div className="admin-subheading-row">
        <div>
          <h3>Post-Session Operations & Close-Out</h3>
          <p className="admin-subtitle">
            Conclude training sessions, transition status to archived, mark leftover open questions as
            unanswered, and dispatch archive links to opted-in participants.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Sessions Table / List */}
      <div className="admin-card" style={{ marginTop: '1.25rem' }}>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#FFFFFF' }}>
          Select Session to Close Out
        </h4>

        {loading ? (
          <div className="empty-state">
            <p>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <p>No training sessions available to manage.</p>
          </div>
        ) : (
          <div className="closeout-sessions-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Session Title</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Speakers</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const isArchived = s.status === SESSION_STATUS.ARCHIVED;
                  const isProcessing = actionLoadingId === s.id;

                  return (
                    <tr key={s.id} id={`closeout-row-${s.id}`}>
                      <td>
                        <strong>{s.title}</strong>
                      </td>
                      <td>
                        {s.date ? new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td>
                        <span className={`status-badge status-${s.status}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        {s.speakers && s.speakers.length > 0
                          ? s.speakers.map((spk) => spk.name).join(', ')
                          : 'No speakers assigned'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            id={`close-session-btn-${s.id}`}
                            onClick={() => handleCloseSession(s)}
                            disabled={isProcessing}
                            title="Advances session to archived and marks open questions as unanswered"
                          >
                            {isProcessing ? 'Closing...' : isArchived ? 'Re-run Close-Out' : '🔒 Close Session'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unanswered Questions Results Board */}
      {closedSession && (
        <div className="admin-card closeout-results-card" id="closeout-results-section" style={{ marginTop: '2rem' }}>
          <div className="closeout-results-header">
            <div>
              <span className="archive-badge">📁 Post-Session Summary</span>
              <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginTop: '0.25rem' }}>
                Close-Out Results: {closedSession.title}
              </h3>
              <p className="admin-subtitle">
                The session has been archived. All open questions were converted to <strong>unanswered</strong>.
              </p>
            </div>

            {/* Optional Feature: Email archive link to opted-in participants */}
            <div className="closeout-actions-group">
              <button
                type="button"
                className="btn btn-secondary"
                id="email-archive-askers-btn"
                onClick={() => handleNotifyArchive(closedSession.id)}
                disabled={notifyingEmail}
              >
                {notifyingEmail ? 'Sending Emails...' : '📧 Email Archive Link to Opted-in Askers'}
              </button>
            </div>
          </div>

          {emailNotificationResult && (
            <div className="alert alert-success" style={{ marginTop: '1rem' }}>
              ✓ {emailNotificationResult.message} ({emailNotificationResult.notifiedCount} delivered).
            </div>
          )}

          {/* Unanswered Questions List */}
          <div className="unanswered-list-container" style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', color: '#F1F5F9', marginBottom: '0.75rem' }}>
              Unanswered Questions ({unansweredList.length})
            </h4>

            {unansweredList.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                  No unanswered questions remaining!
                </p>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  All submitted questions were answered during the live training session.
                </span>
              </div>
            ) : (
              <div className="unanswered-cards-stack">
                {unansweredList.map((q) => (
                  <div key={q.id} className="unanswered-card" id={`unanswered-q-${q.id}`}>
                    <div className="unanswered-card-header">
                      <span className="unanswered-badge">⏳ Unanswered</span>
                      <span className="unanswered-upvotes">▲ {q.upvotes} upvotes</span>
                    </div>

                    <p className="unanswered-body">{q.body}</p>

                    <div className="unanswered-meta-row">
                      <span className="meta-item">
                        👤 Asker: <strong>{q.askerName || 'Anonymous'}</strong>
                      </span>
                      {q.contact?.email && (
                        <span className="meta-item email-meta">
                          ✉️ Contact: <code>{q.contact.email}</code>
                        </span>
                      )}
                      <span className="meta-item">
                        {q.archive ? '✅ Opted into public archive' : '🔒 Private (not archived)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
