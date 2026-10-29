import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import { SESSION_STATUS } from '../models/types.js';
import SessionBanner from './SessionBanner.jsx';
import NewSessionForm from './NewSessionForm.jsx';
import SpeakerProfile from './SpeakerProfile.jsx';
import AskQuestion from './AskQuestion.jsx';
import QuestionList from './QuestionList.jsx';
import SpeakerQueue from './SpeakerQueue.jsx';
import SessionAdmin from './SessionAdmin.jsx';

export default function SessionList({
  onSelectSession,
  selectedSessionId,
  onOpenArchive,
  userRole = 'participant',
  activeSpeaker = null,
  speakerPin = '',
  adminToken = '',
}) {
  const [sessionsData, setSessionsData] = useState({ active: [], past: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewingSession, setViewingSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionViewMode, setSessionViewMode] = useState(
    userRole === 'speaker' ? 'speaker' : 'participant'
  );
  const [questions, setQuestions] = useState([]);
  const [advancingId, setAdvancingId] = useState(null);

  // Sync view mode when role changes
  useEffect(() => {
    if (userRole === 'speaker') {
      setSessionViewMode('speaker');
    } else if (userRole === 'participant') {
      setSessionViewMode('participant');
    }
  }, [userRole, viewingSession]);

  const fetchQuestions = async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (!res.ok) {
        throw new Error(`Failed to load sessions (${res.status})`);
      }
      const data = await res.json();
      setSessionsData({
        active: data.active || [],
        past: data.past || [],
      });

      // If we are currently viewing a session, refresh its state
      if (viewingSession) {
        const all = [...(data.active || []), ...(data.past || [])];
        const updated = all.find((s) => s.id === viewingSession.id);
        if (updated) {
          setViewingSession(updated);
          fetchQuestions(updated.id);
        }
      }
    } catch (err) {
      setError(err.message || 'Error fetching sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleAdvance = async (sessionId, e) => {
    if (e) e.stopPropagation();
    setAdvancingId(sessionId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/advance`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to advance session status');
      }
      await fetchSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdvancingId(null);
    }
  };

  const handleCardClick = (session) => {
    setViewingSession(session);
    fetchQuestions(session.id);
    if (onSelectSession) onSelectSession(session);
  };

  const handleFloatingAskClick = () => {
    if (sessionViewMode !== 'participant') {
      setSessionViewMode('participant');
    }
    setTimeout(() => {
      const askContainer = document.getElementById('ask-question-form-container');
      const inputField = document.getElementById('question-body-input');
      if (askContainer) {
        askContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        askContainer.classList.add('highlight-glow');
        setTimeout(() => askContainer.classList.remove('highlight-glow'), 2000);
      }
      if (inputField) {
        inputField.focus();
      }
    }, 150);
  };

  if (editingSession) {
    return (
      <SessionAdmin
        session={editingSession}
        onBack={() => {
          setEditingSession(null);
          fetchSessions();
        }}
        onSessionUpdated={() => {
          setEditingSession(null);
          fetchSessions();
        }}
      />
    );
  }

  return (
    <div className="sessions-container" id="sessions-view-wrapper">
      {/* Session Detail View if one is opened */}
      {viewingSession ? (
        <div className="session-detail-view" id="session-detail-view">
          <div className="session-detail-nav">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setViewingSession(null);
                setQuestions([]);
              }}
              id="back-to-sessions-btn"
            >
              ← Back to All Sessions
            </button>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  window.open(`/session/${viewingSession.id}/live`, '_blank');
                }}
                id="open-projector-btn"
                title="Open Projector / Live Hall Screen in new window"
              >
                📽️ Live Projector Screen
              </button>

              {viewingSession.status === SESSION_STATUS.ARCHIVED && onOpenArchive && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenArchive(viewingSession.id)}
                  id="open-archive-format-btn"
                  title="View Official Curated Public Archive"
                >
                  📁 Public Archive View
                </button>
              )}

              {userRole === 'admin' && viewingSession.status !== SESSION_STATUS.ARCHIVED && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingSession(viewingSession)}
                    id="edit-current-session-btn"
                  >
                    ✏️ Edit Session
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => handleAdvance(viewingSession.id, e)}
                    disabled={advancingId === viewingSession.id}
                    id="advance-session-btn"
                  >
                    {viewingSession.status === SESSION_STATUS.UPCOMING
                      ? '🚀 Advance to Live'
                      : '📁 Advance to Archived'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <SessionBanner session={viewingSession} compact={false} />
          </div>

          {viewingSession.status === SESSION_STATUS.ARCHIVED && (
            <div
              className="alert alert-info"
              style={{
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '0.9rem 1.25rem',
                color: '#e0f2fe',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📁</span>
                <div>
                  <strong style={{ display: 'block', color: '#38bdf8', fontSize: '0.95rem' }}>
                    Archived Training Session (Read-Only)
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    This training session has concluded. All submitted questions, verified speaker answers, and attendee upvotes are preserved below for reference.
                  </span>
                </div>
              </div>
              {onOpenArchive && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => onOpenArchive(viewingSession.id)}
                  style={{ whiteSpace: 'nowrap', borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 600 }}
                >
                  Public Archive Format →
                </button>
              )}
            </div>
          )}

          {/* View Mode Switcher: Only visible to Speakers and Admin, NOT participants */}
          {userRole !== 'participant' && (
            <div className="session-view-mode-bar" style={{ marginTop: '2rem' }}>
              <div className="view-mode-toggle-group">
                <button
                  type="button"
                  className={`btn btn-sm ${sessionViewMode === 'participant' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSessionViewMode('participant')}
                  id="participant-view-btn"
                >
                  💬 Participant Q&A
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${sessionViewMode === 'speaker' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSessionViewMode('speaker')}
                  id="speaker-queue-view-btn"
                >
                  🎙️ Speaker Queue ({questions.filter((q) => q.status === 'open').length} Open)
                </button>
              </div>
            </div>
          )}

          {/* Speaker Answer Queue View */}
          {sessionViewMode === 'speaker' && (
            <div style={{ marginTop: '1.5rem' }}>
              <SpeakerQueue
                sessionId={viewingSession.id}
                speakers={viewingSession.speakers || []}
                activeSpeaker={activeSpeaker}
                speakerPin={speakerPin}
                adminToken={adminToken}
                onReplySent={() => fetchQuestions(viewingSession.id)}
              />
            </div>
          )}

          {/* Participant Interactive Q&A Area */}
          {sessionViewMode === 'participant' && (
            <div className="session-qa-layout" style={{ marginTop: '1.5rem' }}>
              <div className="session-qa-ask-col">
                <AskQuestion
                  sessionId={viewingSession.id}
                  speakers={viewingSession.speakers || []}
                  isArchived={viewingSession.status === SESSION_STATUS.ARCHIVED}
                  onQuestionSubmitted={() => fetchQuestions(viewingSession.id)}
                />
              </div>

              <div className="session-qa-list-col">
                <QuestionList
                  questions={questions}
                  sessionId={viewingSession.id}
                  isArchived={viewingSession.status === SESSION_STATUS.ARCHIVED}
                  onQuestionUpvoted={() => fetchQuestions(viewingSession.id)}
                />
              </div>
            </div>
          )}

          <div className="session-detail-speakers" style={{ marginTop: '3.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#FFFFFF' }}>
              Assigned Session Speakers ({viewingSession.speakers?.length || 0})
            </h3>
            {viewingSession.speakers && viewingSession.speakers.length > 0 ? (
              <div className="speakers-grid">
                {viewingSession.speakers.map((spk) => (
                  <SpeakerProfile key={spk.id} speaker={spk} />
                ))}
              </div>
            ) : (
              <p className="text-muted">No speaker profiles linked to this session.</p>
            )}
          </div>

          {/* Floating Action Button for Easy Question Asking */}
          {viewingSession.status !== SESSION_STATUS.ARCHIVED && (
            <button
              type="button"
              className="floating-ask-btn"
              id="floating-ask-btn"
              onClick={handleFloatingAskClick}
              aria-label="Ask a question"
              title="Tap to ask a question"
            >
              <span className="fab-icon">💬</span>
              <span className="fab-text">ASK</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Header Controls */}
          <div className="sessions-header-row">
            <div>
              <h2 className="section-title">Training Sessions</h2>
              <p className="section-desc">
                Browse active training sessions or review past session archives.
              </p>
            </div>

            {userRole === 'admin' && (
              <button
                type="button"
                className="btn btn-primary"
                id="create-session-trigger-btn"
                onClick={() => setShowCreateForm((prev) => !prev)}
              >
                {showCreateForm ? 'Close Form' : '+ Create Session'}
              </button>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* New Session Form Collapsible Modal/Card (Admin Only) */}
          {userRole === 'admin' && showCreateForm && (
            <div style={{ marginBottom: '2.5rem' }}>
              <NewSessionForm
                onSessionCreated={() => {
                  setShowCreateForm(false);
                  fetchSessions();
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}

          {/* Active Sessions Section */}
          <section className="sessions-group-section" id="active-sessions-section">
            <div className="sessions-group-header">
              <h3 className="group-heading">
                Active Sessions ({sessionsData.active.length})
              </h3>
              <span className="group-sub">Upcoming & Live training sessions</span>
            </div>

            {loading && sessionsData.active.length === 0 ? (
              <div className="empty-state">
                <p>Loading active sessions...</p>
              </div>
            ) : sessionsData.active.length === 0 ? (
              <div
                className="empty-state"
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'var(--surface-color)',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-color)',
                  margin: '1rem 0',
                }}
              >
                <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>🎯</div>
                <h3 style={{ marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  No Active Sessions Scheduled
                </h3>
                {userRole === 'admin' ? (
                  <>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Ready to start the event? Create your session now so participants can ask questions and speakers can answer live.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setShowCreateForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{ padding: '0.65rem 1.4rem', fontWeight: 700 }}
                    >
                      + Create New Session Now
                    </button>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>
                    No sessions are currently open for questions. As soon as the host starts a session, it will appear here!
                  </p>
                )}
              </div>
            ) : (
              <div className="sessions-cards-grid">
                {sessionsData.active.map((session) => (
                  <div
                    key={session.id}
                    className="session-card-wrapper"
                    onClick={() => handleCardClick(session)}
                    id={`session-card-${session.id}`}
                  >
                    <SessionBanner session={session} compact={true} />
                    <div className="session-card-footer">
                      <div className="session-speaker-avatars">
                        {session.speakers?.map((spk) => (
                          <span
                            key={spk.id}
                            className="mini-speaker-pill"
                            title={`${spk.name} - ${spk.topic}`}
                          >
                            👤 {spk.name}
                          </span>
                        ))}
                      </div>

                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleCardClick(session)}
                          id={`join-session-btn-${session.id}`}
                        >
                          {session.status === SESSION_STATUS.LIVE ? '🔴 Join Live Q&A →' : 'View Q&A →'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => window.open(`/session/${session.id}/live`, '_blank')}
                          title="Open Live Projector View in second window"
                        >
                          📽️ Live Screen
                        </button>
                        {userRole === 'admin' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => setEditingSession(session)}
                              id={`edit-session-btn-${session.id}`}
                              title="Edit session sponsors and details"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={(e) => handleAdvance(session.id, e)}
                              disabled={advancingId === session.id}
                              title="Advance session progression"
                            >
                              {session.status === SESSION_STATUS.UPCOMING
                                ? 'Go Live →'
                                : 'Archive →'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past Sessions Section */}
          <section
            className="sessions-group-section"
            id="past-sessions-section"
            style={{ marginTop: '3.5rem' }}
          >
            <div className="sessions-group-header">
              <h3 className="group-heading">
                Past Sessions ({sessionsData.past.length})
              </h3>
              <span className="group-sub">Archived training sessions and Q&A history</span>
            </div>

            {sessionsData.past.length === 0 ? (
              <div className="empty-state">
                <p>No archived sessions yet. When live sessions conclude, they appear here.</p>
              </div>
            ) : (
              <div className="sessions-cards-grid">
                {sessionsData.past.map((session) => (
                  <div
                    key={session.id}
                    className="session-card-wrapper session-card-past"
                    onClick={() => handleCardClick(session)}
                    id={`session-card-${session.id}`}
                  >
                    <SessionBanner session={session} compact={true} />
                    <div className="session-card-footer">
                      <div className="session-speaker-avatars">
                        {session.speakers?.map((spk) => (
                          <span
                            key={spk.id}
                            className="mini-speaker-pill"
                            title={`${spk.name} - ${spk.topic}`}
                          >
                            👤 {spk.name}
                          </span>
                        ))}
                      </div>
                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleCardClick(session)}
                          id={`view-qa-btn-${session.id}`}
                          title="View all questions and answers from this session"
                        >
                          👁️ View Q&A History →
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            if (onOpenArchive) {
                              onOpenArchive(session.id);
                            } else {
                              handleCardClick(session);
                            }
                          }}
                          id={`view-archive-btn-${session.id}`}
                          title="Open Curated Public Archive view"
                        >
                          📁 View Archive →
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => window.open(`/session/${session.id}/live`, '_blank')}
                          title="Open Live Projector View in second window"
                        >
                          📽️ Live Screen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Global Floating Action Button for Questions */}
          <button
            type="button"
            className="floating-ask-btn"
            id="floating-ask-btn-global"
            onClick={() => {
              if (sessionsData.active && sessionsData.active.length > 0) {
                const targetSession =
                  sessionsData.active.find((s) => s.status === SESSION_STATUS.LIVE) ||
                  sessionsData.active[0];
                handleCardClick(targetSession);
                setTimeout(() => {
                  const askContainer = document.getElementById('ask-question-form-container');
                  const inputField = document.getElementById('question-body-input');
                  if (askContainer) {
                    askContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    askContainer.classList.add('highlight-glow');
                    setTimeout(() => askContainer.classList.remove('highlight-glow'), 2000);
                  }
                  if (inputField) inputField.focus();
                }, 250);
              } else {
                if (userRole === 'admin') {
                  setShowCreateForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  alert(
                    'No active Q&A sessions are open yet. Once the host starts a session, tapping ASK lets you submit questions immediately!'
                  );
                }
              }
            }}
            aria-label="Ask a question"
            title="Tap to ask a question"
          >
            <span className="fab-icon">💬</span>
            <span className="fab-text">ASK</span>
          </button>
        </>
      )}
    </div>
  );
}
