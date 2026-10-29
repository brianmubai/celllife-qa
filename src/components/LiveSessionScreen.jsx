import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import SessionBanner from './SessionBanner.jsx';
import SponsorStrip from './SponsorStrip.jsx';
import ParticipantQRModal from './ParticipantQRModal.jsx';

export default function LiveSessionScreen({ sessionId, onExit }) {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  });

  // Clock updating every 1s
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling data every 5 seconds
  const fetchLiveData = async () => {
    if (!sessionId) return;
    try {
      const [sessRes, qRes] = await Promise.all([
        fetch(`${API_BASE}/sessions/${sessionId}`),
        fetch(`${API_BASE}/sessions/${sessionId}/questions`),
      ]);

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSession(sessData);
      }

      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData);
      }
    } catch (err) {
      console.error('Error polling live screen data:', err);
      setError('Connection interrupted. Retrying in 5 seconds...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Open questions: sorted by upvotes descending, then createdAt descending
  const openQuestions = questions
    .filter((q) => q.status === 'open')
    .sort((a, b) => {
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Answered questions: sorted newest first
  const answeredQuestions = questions
    .filter((q) => q.status === 'answered')
    .sort((a, b) => {
      const timeA = a.replies?.[0]?.repliedAt || a.createdAt;
      const timeB = b.replies?.[0]?.repliedAt || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

  if (loading && !session) {
    return (
      <div className="projector-screen-wrapper projector-loading">
        <div className="projector-loading-box">
          <span className="live-pulse-dot" style={{ width: 14, height: 14 }} />
          <h2>Connecting to Live Session Screen...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="projector-screen-wrapper" id="live-projector-screen">
      {/* Top Projector Header */}
      <header className="projector-header">
        <div className="projector-header-top">
          <div className="projector-brand-group">
            <img
              src="/celllife-logo.png"
              alt="cellLife"
              className="projector-logo-img"
            />
            <div className="projector-live-badge-group">
              <span className="projector-live-tag">
                <span className="live-pulse-dot" /> LIVE SESSION SCREEN
              </span>
              <span className="projector-clock" aria-label="Current time">
                🕒 {currentTime}
              </span>
            </div>
          </div>

          <div className="projector-controls">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowQrModal(true)}
              id="open-projector-qr-btn"
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              📱 Scan to Join (QR)
            </button>
            <span className="projector-poll-indicator" title="Auto-refreshes every 5s">
              ⚡ Live Sync (5s)
            </span>
            {onExit && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={onExit}
                id="exit-projector-btn"
              >
                ✕ Exit Fullscreen
              </button>
            )}
          </div>
        </div>

        {/* Hero Session Banner */}
        {session && (
          <div className="projector-banner-container">
            <SessionBanner session={session} compact={true} />
          </div>
        )}

        {/* Speaker Roster Bar with Topics */}
        {session?.speakers && session.speakers.length > 0 && (
          <div className="projector-speakers-roster">
            <span className="roster-label">Featured Experts:</span>
            <div className="roster-items">
              {session.speakers.map((spk) => (
                <div key={spk.id} className="roster-speaker-chip">
                  <span className="chip-avatar">
                    {spk.photoUrl ? (
                      <img src={spk.photoUrl} alt="" className="chip-img" />
                    ) : (
                      '👤'
                    )}
                  </span>
                  <div className="chip-text">
                    <strong className="chip-name">{spk.name}</strong>
                    <span className="chip-topic">{spk.topic}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {error && <div className="alert alert-error" style={{ margin: '1rem 2rem' }}>{error}</div>}

      {/* Main Projector Split Grid */}
      <main className="projector-main-grid">
        {/* Left Column: Open Questions Board */}
        <section className="projector-column projector-open-col" id="open-questions-board">
          <div className="column-header">
            <div className="column-title-wrap">
              <h2 className="column-title">
                🔥 Open Questions ({openQuestions.length})
              </h2>
              <span className="column-subtitle">Ranked by attendee votes</span>
            </div>
          </div>

          {openQuestions.length === 0 ? (
            <div className="projector-empty-box">
              <span className="empty-emoji">💬</span>
              <h3>No open questions right now</h3>
              <p>Participants can ask questions live from their devices.</p>
            </div>
          ) : (
            <div className="projector-questions-stream">
              {openQuestions.map((q, idx) => (
                <article
                  key={q.id}
                  className={`projector-card open-card ${idx === 0 ? 'top-voted-card' : ''}`}
                  id={`projector-open-card-${q.id}`}
                >
                  <div className="projector-card-meta">
                    <span
                      className={`speaker-target-tag ${q.speakerId ? 'speaker-specific' : 'speaker-any'}`}
                    >
                      {q.speakerId ? `👤 ${q.speaker?.name || 'Speaker'}` : '🎯 Any Speaker'}
                    </span>

                    <div className="projector-upvote-display">
                      <span className="upvote-arrow">▲</span>
                      <strong className="upvote-number">{q.upvotes}</strong>
                    </div>
                  </div>

                  <p className="projector-question-body">{q.body}</p>

                  <div className="projector-card-footer">
                    <span className="projector-asker">
                      {q.askerName ? `From ${q.askerName}` : 'Anonymous Attendee'}
                    </span>
                    <span className="projector-time">
                      {new Date(q.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Answered Strip */}
        <section className="projector-column projector-answered-col" id="answered-questions-strip">
          <div className="column-header">
            <div className="column-title-wrap">
              <h2 className="column-title">
                ✓ Answered Stream ({answeredQuestions.length})
              </h2>
              <span className="column-subtitle">Live answers delivered from speakers</span>
            </div>
          </div>

          {answeredQuestions.length === 0 ? (
            <div className="projector-empty-box">
              <span className="empty-emoji">🎙️</span>
              <h3>Awaiting speaker responses</h3>
              <p>Answers will appear here live as speakers answer questions.</p>
            </div>
          ) : (
            <div className="projector-questions-stream">
              {answeredQuestions.map((q) => {
                const latestReply = q.replies?.[0];
                return (
                  <article
                    key={q.id}
                    className="projector-card answered-card"
                    id={`projector-answered-card-${q.id}`}
                  >
                    <div className="projector-card-meta">
                      <span className="answered-status-tag">✓ ANSWERED</span>
                      <span
                        className={`speaker-target-tag ${q.speakerId ? 'speaker-specific' : 'speaker-any'}`}
                      >
                        {q.speakerId ? `👤 ${q.speaker?.name || 'Speaker'}` : '🎯 Any Speaker'}
                      </span>
                    </div>

                    <p className="projector-question-body answered-question-quote">
                      "{q.body}"
                    </p>

                    {latestReply && (
                      <div className="projector-answer-callout">
                        <div className="callout-speaker-label">
                          🎙️ Answer from{' '}
                          <strong>{latestReply.speaker?.name || 'Speaker'}</strong>:
                        </div>
                        <p className="callout-answer-text">{latestReply.body}</p>
                      </div>
                    )}

                    <div className="projector-card-footer">
                      <span className="projector-asker">
                        {q.askerName ? `Asked by ${q.askerName}` : 'Anonymous Attendee'}
                      </span>
                      {latestReply && (
                        <span className="projector-time">
                          Answered at{' '}
                          {new Date(latestReply.repliedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {session?.sponsors && session.sponsors.length > 0 && (
        <footer className="projector-footer-sponsors" id="projector-sponsors-section" style={{ marginTop: '2.5rem', paddingBottom: '2rem' }}>
          <SponsorStrip sponsors={session.sponsors} />
        </footer>
      )}

      {/* Participant QR Modal */}
      <ParticipantQRModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        sessionTitle={session?.title || 'Live Q&A Session'}
        targetUrl={typeof window !== 'undefined' ? `${window.location.origin}/ask` : 'https://cellife.co.zw/ask'}
      />
    </div>
  );
}
