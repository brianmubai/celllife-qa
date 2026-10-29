import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';

export default function ArchiveSearch({ onSelectSession }) {
  const [keyword, setKeyword] = useState('');
  const [speakerId, setSpeakerId] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [speakers, setSpeakers] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const [archivedSessions, setArchivedSessions] = useState([]);

  // Fetch speakers for dropdown filter and past sessions list
  useEffect(() => {
    const fetchSpeakersAndSessions = async () => {
      try {
        const [spkRes, sessRes] = await Promise.all([
          fetch(`${API_BASE}/speakers`),
          fetch(`${API_BASE}/sessions`),
        ]);
        if (spkRes.ok) {
          const data = await spkRes.json();
          setSpeakers(data);
        }
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setArchivedSessions(sessData.past || []);
        }
      } catch (err) {
        console.error('Error fetching speakers or sessions for archive:', err);
      }
    };
    fetchSpeakersAndSessions();
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.append('q', keyword.trim());
      if (speakerId && speakerId !== 'all') params.append('speakerId', speakerId);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(`${API_BASE}/archive/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Error executing search');
    } finally {
      setLoading(false);
    }
  };

  // Run initial search on mount to populate initial archive results
  useEffect(() => {
    handleSearch();
  }, []);

  const handleClear = () => {
    setKeyword('');
    setSpeakerId('all');
    setFromDate('');
    setToDate('');
    // Trigger empty search
    setTimeout(() => {
      fetch(`${API_BASE}/archive/search`)
        .then((res) => res.json())
        .then((data) => setResults(data))
        .catch(console.error);
    }, 0);
  };

  return (
    <div className="archive-search-container" id="archive-search-wrapper">
      <div className="search-header-box">
        <span className="archive-badge">📁 Public Knowledge Base</span>
        <h2 className="search-title">Search Archived Q&A History</h2>
        <p className="search-desc">
          Search past questions, expert answers, and training insights across all archived sessions.
        </p>

        {/* Search Controls Form */}
        <form onSubmit={handleSearch} className="archive-search-form">
          <div className="search-inputs-grid">
            <div className="form-group keyword-group">
              <label htmlFor="search-keyword-input" className="form-label">
                Search Keyword
              </label>
              <input
                id="search-keyword-input"
                type="text"
                placeholder="e.g. latency, state, routing, agent..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="search-speaker-select" className="form-label">
                Speaker / Expert
              </label>
              <select
                id="search-speaker-select"
                value={speakerId}
                onChange={(e) => setSpeakerId(e.target.value)}
                className="form-input form-select"
              >
                <option value="all">All Speakers</option>
                {speakers.map((spk) => (
                  <option key={spk.id} value={spk.id}>
                    👤 {spk.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="search-from-date" className="form-label">
                From Date
              </label>
              <input
                id="search-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="search-to-date" className="form-label">
                To Date
              </label>
              <input
                id="search-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="search-actions-row">
            <button type="submit" className="btn btn-primary" id="archive-search-submit-btn">
              🔍 Search Archive
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClear}
              id="archive-search-clear-btn"
            >
              Reset Filters
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Previous Sessions Directory */}
      <div className="archived-sessions-directory" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0 }}>
              Archived Sessions ({archivedSessions.length})
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Select any past training session to review its complete Q&A archive
            </span>
          </div>
        </div>

        {archivedSessions.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p>No archived sessions yet. When live sessions conclude, they appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {archivedSessions.map((sess) => (
              <div
                key={sess.id}
                className="archived-session-pill-card"
                style={{
                  background: 'var(--surface-color, #1e293b)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '1.35rem' }}>{sess.branding?.emoji || '📁'}</span>
                    <strong style={{ color: '#FFFFFF', fontSize: '1.05rem' }}>{sess.title}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    📅 {sess.date ? new Date(sess.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Past Session'}
                  </div>
                  {sess.speakers && sess.speakers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {sess.speakers.map((spk) => (
                        <span key={spk.id} className="mini-speaker-pill" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                          👤 {spk.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => onSelectSession && onSelectSession(sess.id)}
                  id={`browse-archive-session-${sess.id}`}
                  style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
                >
                  Open Session Archive →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="search-results-section">
        <div className="results-header">
          <h3>
            Search Results ({results.length})
          </h3>
          {hasSearched && keyword && (
            <span className="results-sub">
              Filtered by keyword: <strong>"{keyword}"</strong>
            </span>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Searching public archive...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '2.5rem' }}>🔎</span>
            <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>No archive records found</p>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Try adjusting your keyword query, speaker filter, or date range.
            </span>
          </div>
        ) : (
          <div className="search-results-grid">
            {results.map((item) => {
              const reply = item.replies?.[0];
              const speakerName = reply?.speaker?.name || item.speaker?.name || 'Speaker';

              return (
                <article
                  key={item.id}
                  className="search-result-card"
                  id={`archive-result-${item.id}`}
                >
                  <div className="result-card-header">
                    <div className="session-pill-tag">
                      📅 {item.session?.title || 'Archived Session'}
                    </div>
                    <span className="result-upvotes">▲ {item.upvotes}</span>
                  </div>

                  <div className="result-question-block">
                    <strong className="block-label">Q:</strong>
                    <p className="result-question-text">{item.body}</p>
                  </div>

                  {reply && (
                    <div className="result-answer-block">
                      <div className="answer-speaker-chip">
                        🎙️ <strong>{speakerName}</strong>:
                      </div>
                      <p className="result-answer-text">{reply.body}</p>
                    </div>
                  )}

                  <div className="result-card-footer">
                    <span className="result-date">
                      Session Date:{' '}
                      {item.session?.date
                        ? new Date(item.session.date).toLocaleDateString()
                        : 'Archived'}
                    </span>

                    {onSelectSession && item.session?.id && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => onSelectSession(item.session.id)}
                        id={`view-archive-session-${item.session.id}`}
                      >
                        Open Session Archive →
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
