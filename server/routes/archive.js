import express from 'express';
import { store } from '../store.js';
import { QUESTION_STATUS, SESSION_STATUS } from '../../src/models/types.js';
import { toPublicQuestion } from './questions.js';

const router = express.Router();

/* ==========================================================================
   Archive Routes
   ========================================================================== */

// GET /api/sessions/:id/archive -> returns session questions (answered by default, or all with ?includeAll=true)
router.get('/sessions/:id/archive', (req, res) => {
  const sessionId = req.params.id;
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { includeAll, status } = req.query;

  let sessionQuestions = store.questions.filter((q) => q.sessionId === sessionId);

  if (includeAll === 'true' || status === 'all') {
    // Return all session questions opted into public archive
    sessionQuestions = sessionQuestions.filter((q) => q.archive !== false);
  } else if (status === 'unanswered') {
    sessionQuestions = sessionQuestions.filter(
      (q) => q.archive !== false && q.status !== QUESTION_STATUS.ANSWERED
    );
  } else {
    // Answered questions where archive === true (or all if none are answered yet)
    const answered = sessionQuestions.filter(
      (q) => q.archive === true && q.status === QUESTION_STATUS.ANSWERED
    );
    sessionQuestions = answered.length > 0 ? answered : sessionQuestions.filter((q) => q.archive !== false);
  }

  const result = sessionQuestions
    .sort((a, b) => {
      if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .map(toPublicQuestion);

  res.json(result);
});

// GET /api/archive/search?q=&speakerId=&from=&to=&status= -> search archived sessions & questions/answers
router.get('/archive/search', (req, res) => {
  const { q = '', speakerId, from, to, status } = req.query;
  const searchTerm = String(q).trim().toLowerCase();

  // 1. Only archived sessions are searched
  const archivedSessions = store.sessions.filter(
    (s) => s.status === SESSION_STATUS.ARCHIVED
  );

  const results = [];

  for (const session of archivedSessions) {
    // Filter by session date range if provided
    if (from && session.date && new Date(session.date) < new Date(from)) {
      continue;
    }
    if (to && session.date && new Date(session.date) > new Date(to)) {
      continue;
    }

    // Filter by speakerId if provided
    if (
      speakerId &&
      speakerId !== 'all' &&
      (!Array.isArray(session.speakerIds) || !session.speakerIds.includes(speakerId))
    ) {
      continue;
    }

    // Find questions in this session
    const sessionQuestions = store.questions.filter((question) => {
      if (question.sessionId !== session.id) return false;
      if (question.archive === false) return false;
      if (status === 'answered' && question.status !== QUESTION_STATUS.ANSWERED) return false;
      if (status === 'unanswered' && question.status === QUESTION_STATUS.ANSWERED) return false;
      return true;
    });

    for (const question of sessionQuestions) {
      // Find replies for this question
      const replies = store.replies.filter((r) => r.questionId === question.id);

      // If speakerId is specified, question or reply must relate to that speaker
      if (
        speakerId &&
        speakerId !== 'all' &&
        question.speakerId !== speakerId &&
        !replies.some((r) => r.speakerId === speakerId)
      ) {
        continue;
      }

      // Keyword match in question body or reply text or asker name
      if (searchTerm) {
        const questionMatch = (question.body || '').toLowerCase().includes(searchTerm);
        const replyMatch = replies.some((r) => (r.body || '').toLowerCase().includes(searchTerm));
        const askerMatch = (question.askerName || '').toLowerCase().includes(searchTerm);

        if (!questionMatch && !replyMatch && !askerMatch) {
          continue;
        }
      }

      const publicQuestion = toPublicQuestion(question);

      results.push({
        ...publicQuestion,
        session: {
          id: session.id,
          title: session.title,
          date: session.date,
          branding: session.branding,
        },
      });
    }
  }

  // Sort results by upvotes descending, then newest date
  results.sort((a, b) => {
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json(results);
});

export default router;
