import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import SessionBanner from './SessionBanner.jsx';
import SponsorStrip from './SponsorStrip.jsx';

export default function SessionArchive({ sessionId, onBack }) {
  const [session, setSession] = useState(null);
  const [archiveQuestions, setArchiveQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState('all');
  const [answeredStatusFilter, setAnsweredStatusFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchArchiveData = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const [sessRes, qRes] = await Promise.all([
        fetch(`${API_BASE}/sessions/${sessionId}`),
        fetch(`${API_BASE}/sessions/${sessionId}/archive?includeAll=true`),
      ]);

      if (!sessRes.ok) {
        throw new Error(`Failed to load session details (${sessRes.status})`);
      }
      if (!qRes.ok) {
        throw new Error(`Failed to load session archive (${qRes.status})`);
      }

      const sessData = await sessRes.json();
      const qData = await qRes.json();

      setSession(sessData);
      setArchiveQuestions(qData);
    } catch (err) {
      setError(err.message || 'Error fetching session archive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchiveData();
  }, [sessionId]);

  // Apply client-side filters on the archive questions
  const filteredQuestions = archiveQuestions.filter((q) => {
    // Speaker filter
    if (selectedSpeakerFilter !== 'all') {
      const matchesTarget = q.speakerId === selectedSpeakerFilter;
      const matchesReplySpeaker = q.replies?.some((r) => r.speakerId === selectedSpeakerFilter);
      if (!matchesTarget && !matchesReplySpeaker) return false;
    }

    // Answered status filter
    if (answeredStatusFilter === 'answered' && q.status !== 'answered') {
      return false;
    }
    if (answeredStatusFilter === 'unanswered' && q.status === 'answered') {
      return false;
    }

    // Keyword filter
    if (searchKeyword.trim()) {
      const term = searchKeyword.toLowerCase();
      const matchesQuestion = (q.body || '').toLowerCase().includes(term);
      const matchesAnswer = q.replies?.some((r) => (r.body || '').toLowerCase().includes(term));
      const matchesAsker = (q.askerName || '').toLowerCase().includes(term);
      if (!matchesQuestion && !matchesAnswer && !matchesAsker) return false;
    }

    return true;
  });

  return (
    <div className="session-archive-container" id="session-archive-view">
      <div className="archive-nav-bar">
        {onBack && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onBack}
            id="archive-back-btn"
          >
            ← Back
          </button>
        )}
        <div className="archive-heading-badge">
          📁 Official Session Public Archive
        </div>
      </div>

      {session && (
        <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          <SessionBanner session={session} compact={false} />
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="archive-filters-bar">
        <div className="filter-group">
          <label htmlFor="archive-speaker-filter" className="form-label">
            Filter by Speaker:
          </label>
          <select
            id="archive-speaker-filter"
            value={selectedSpeakerFilter}
            onChange={(e) => setSelectedSpeakerFilter(e.target.value)}
            className="form-input form-select"
          >
            <option value="all">All Speakers & Panelists</option>
            {session?.speakers?.map((spk) => (
              <option key={spk.id} value={spk.id}>
                👤 {spk.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="archive-status-filter" className="form-label">
            Answer Status:
          </label>
          <select
            id="archive-status-filter"
            value={answeredStatusFilter}
            onChange={(e) => setAnsweredStatusFilter(e.target.value)}
            className="form-input form-select"
          >
            <option value="all">All Session Questions ({archiveQuestions.length})</option>
            <option value="answered">Answered Only ({archiveQuestions.filter(q => q.status === 'answered').length})</option>
            <option value="unanswered">Pending / Unanswered ({archiveQuestions.filter(q => q.status !== 'answered').length})</option>
          </select>
        </div>

        <div className="filter-group search-filter-group">
          <label htmlFor="archive-search-input" className="form-label">
            Search Q&A:
          </label>
          <input
            id="archive-search-input"
            type="text"
            placeholder="Search keywords in questions and answers..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {/* Archive Questions Display */}
      <div className="archive-results-section">
        <div className="results-header">
          <h3>
            Session Questions & Answers ({filteredQuestions.length})
          </h3>
          <span className="results-sub">
            Public Q&A history, verified speaker responses, and community queries.
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading session archive...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '2rem' }}>📂</span>
            <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
              {archiveQuestions.length === 0
                ? 'No questions recorded for this session.'
                : 'No archive items matched your filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="archive-qa-stack">
            {filteredQuestions.map((q) => {
              const reply = q.replies?.[0];
              const speakerName = reply?.speaker?.name || q.speaker?.name || 'Speaker';
              const isAnswered = q.status === 'answered';

              return (
                <article
                  key={q.id}
                  className={`archive-qa-card ${isAnswered ? 'archive-card-answered' : ''}`}
                  id={`archive-qa-card-${q.id}`}
                >
                  <div className="archive-question-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="archive-speaker-badge">
                        {q.speakerId ? `👤 ${q.speaker?.name || 'Speaker'}` : '🎯 Any Speaker'}
                      </div>
                      <span className={`question-status-badge ${isAnswered ? 'status-answered' : 'status-unanswered'}`}>
                        {isAnswered ? '✓ Verified Answer' : '⏳ Pending / Live Discussion'}
                      </span>
                    </div>

                    <div className="archive-upvotes-count">
                      ▲ {q.upvotes} upvotes
                    </div>
                  </div>

                  <div className="archive-question-box">
                    <span className="qa-role-label">Question:</span>
                    <p className="archive-question-text">{q.body}</p>
                    <div className="archive-asker-meta">
                      {q.askerName ? `Submitted by ${q.askerName}` : 'Submitted anonymously'} •{' '}
                      {new Date(q.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  {reply ? (
                    <div className="archive-answer-box">
                      <div className="qa-role-label answer-role-label">
                        🎙️ Verified Answer from <strong>{speakerName}</strong>:
                      </div>
                      <p className="archive-answer-text">{reply.body}</p>
                      <div className="archive-answer-meta">
                        Answered on{' '}
                        {new Date(reply.repliedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="archive-no-reply" style={{ padding: '0.75rem 1rem', background: 'rgba(234, 179, 8, 0.08)', border: '1px dashed rgba(234, 179, 8, 0.4)', borderRadius: '8px', color: '#fde047', fontSize: '0.88rem' }}>
                      🎙️ <em>Discussed verbally with speakers during this training session. Written reply pending.</em>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {session?.sponsors && session.sponsors.length > 0 && (
        <div className="archive-footer-sponsors" id="archive-sponsors-section" style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <SponsorStrip sponsors={session.sponsors} />
        </div>
      )}
    </div>
  );
}
