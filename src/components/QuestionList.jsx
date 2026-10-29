import React, { useState } from 'react';
import { API_BASE } from '../config.js';

export default function QuestionList({
  questions = [],
  sessionId,
  isArchived = false,
  onQuestionUpvoted,
}) {
  const [upvotingIds, setUpvotingIds] = useState(new Set());
  const [error, setError] = useState('');

  const handleUpvote = async (qid) => {
    if (isArchived) return;

    setUpvotingIds((prev) => new Set([...prev, qid]));
    setError('');

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/questions/${qid}/upvote`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upvote question');
      }

      if (onQuestionUpvoted) {
        onQuestionUpvoted(data.question);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(qid);
        return next;
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'answered':
        return <span className="question-status-badge status-answered">✓ Answered</span>;
      case 'unanswered':
        return <span className="question-status-badge status-unanswered">⏳ Pending</span>;
      case 'open':
      default:
        return <span className="question-status-badge status-open">💬 Open</span>;
    }
  };

  return (
    <div className="questions-list-container" id="session-questions-list">
      <div className="questions-header-bar">
        <h3 className="questions-title">
          Live Questions ({questions.length})
        </h3>
        <span className="questions-sort-hint">
          Ranked by Upvotes & Date
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {questions.length === 0 ? (
        <div className="empty-state">
          <p>No questions submitted yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="questions-stack">
          {questions.map((q) => {
            const isUpvoting = upvotingIds.has(q.id);
            const speakerLabel = q.speaker ? q.speaker.name : 'Any Speaker';

            return (
              <div
                key={q.id}
                className={`question-item-card ${q.status === 'answered' ? 'question-answered' : ''}`}
                id={`question-card-${q.id}`}
              >
                <div className="question-item-main">
                  <div className="question-meta-row">
                    <span
                      className={`speaker-target-tag ${q.speakerId ? 'speaker-specific' : 'speaker-any'}`}
                    >
                      {q.speakerId ? `👤 ${speakerLabel}` : '🎯 Any Speaker'}
                    </span>

                    {getStatusBadge(q.status)}

                    <span className="question-timestamp">
                      {new Date(q.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="question-body-text">{q.body}</p>

                  <div className="question-footer-row">
                    <span className="asker-name-tag">
                      {q.askerName ? `Asked by ${q.askerName}` : 'Anonymous Participant'}
                    </span>
                    {q.archive && (
                      <span className="archive-eligible-tag" title="Included in public archive">
                        📁 Public Archive
                      </span>
                    )}
                  </div>
                </div>

                <div className="question-item-actions">
                  <button
                    type="button"
                    className={`upvote-btn ${isArchived ? 'upvote-disabled' : ''}`}
                    onClick={() => handleUpvote(q.id)}
                    disabled={isArchived || isUpvoting}
                    title={isArchived ? 'Session is archived' : 'Upvote this question'}
                    id={`upvote-btn-${q.id}`}
                  >
                    <span className="upvote-icon">▲</span>
                    <span className="upvote-count">{q.upvotes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
