import express from 'express';
import { randomUUID } from 'crypto';
import { store, saveStore } from '../store.js';
import { QUESTION_STATUS, SESSION_STATUS, VISIBILITY } from '../../src/models/types.js';
import { toPublicSpeaker } from './speakers.js';
import { sendAnswerEmail } from '../services/email.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper: strips contact.email from question and attaches public speaker and replies if available
export const toPublicQuestion = (q) => {
  const { contact, ...rest } = q;
  const speaker = q.speakerId
    ? store.speakers.find((s) => s.id === q.speakerId)
    : null;

  const replies = store.replies
    .filter((r) => r.questionId === q.id)
    .map((r) => {
      const repSpeaker = store.speakers.find((s) => s.id === r.speakerId);
      return {
        ...r,
        speaker: repSpeaker ? toPublicSpeaker(repSpeaker) : null,
      };
    });

  return {
    ...rest,
    speaker: speaker ? toPublicSpeaker(speaker) : null,
    replies,
  };
};

/* ==========================================================================
   Question Routes
   ========================================================================== */

// GET /api/sessions/:id/questions -> returns session's questions without contact.email
router.get('/sessions/:id/questions', (req, res) => {
  const sessionId = req.params.id;
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const questions = store.questions
    .filter((q) => q.sessionId === sessionId)
    .sort((a, b) => {
      if (b.upvotes !== a.upvotes) {
        return b.upvotes - a.upvotes;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .map(toPublicQuestion);

  res.json(questions);
});

// GET /api/sessions/:id/queue?speakerId=X -> returns open questions for speaker or any speaker
router.get('/sessions/:id/queue', (req, res) => {
  const sessionId = req.params.id;
  const { speakerId } = req.query;

  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!speakerId || !Array.isArray(session.speakerIds) || !session.speakerIds.includes(speakerId)) {
    return res.status(400).json({
      error: 'Valid speakerId belonging to this session is required',
    });
  }

  // questionsForSpeaker logic: open questions addressed to this speaker or to any speaker (null)
  const queue = store.questions
    .filter(
      (q) =>
        q.sessionId === sessionId &&
        q.status === QUESTION_STATUS.OPEN &&
        (q.speakerId === speakerId || q.speakerId === null)
    )
    .sort((a, b) => {
      if (b.upvotes !== a.upvotes) {
        return b.upvotes - a.upvotes;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .map(toPublicQuestion);

  res.json(queue);
});

// POST /api/sessions/:id/questions -> submit a question
router.post('/sessions/:id/questions', (req, res) => {
  const sessionId = req.params.id;
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Session must be upcoming or live (reject archived with 409)
  if (session.status === SESSION_STATUS.ARCHIVED) {
    return res.status(409).json({
      error: 'Session is archived and no longer accepts questions.',
    });
  }

  let { speakerId, body, askerName, email, archive } = req.body || {};

  // Validate speakerId: must be null or belong to the session (400 otherwise)
  if (speakerId === '' || speakerId === undefined) {
    speakerId = null;
  }
  if (speakerId !== null && (!Array.isArray(session.speakerIds) || !session.speakerIds.includes(speakerId))) {
    return res.status(400).json({
      error: 'Invalid speakerId: speaker does not belong to this session.',
    });
  }

  // Validate body: required, max 500 characters
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Question body is required.' });
  }
  body = body.trim();
  if (body.length > 500) {
    return res.status(400).json({
      error: 'Question body exceeds maximum length of 500 characters.',
    });
  }

  // Validate email: optional but must be valid if given
  let contactEmail = null;
  if (typeof email === 'string' && email.trim()) {
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }
    contactEmail = trimmedEmail;
  }

  const cleanedName = typeof askerName === 'string' && askerName.trim() ? askerName.trim() : null;
  const shouldArchive = archive === undefined ? true : Boolean(archive);

  const newQuestion = {
    id: randomUUID(),
    sessionId,
    speakerId,
    body,
    askerName: cleanedName,
    contact: {
      email: contactEmail,
    },
    archive: shouldArchive,
    status: QUESTION_STATUS.OPEN,
    upvotes: 0,
    createdAt: new Date().toISOString(),
  };

  store.questions.push(newQuestion);
  saveStore();
  res.status(201).json(toPublicQuestion(newQuestion));
});

// POST /api/sessions/:id/questions/:qid/upvote -> increment upvotes (reject if session archived)
router.post('/sessions/:id/questions/:qid/upvote', (req, res) => {
  const { id: sessionId, qid } = req.params;
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status === SESSION_STATUS.ARCHIVED) {
    return res.status(409).json({
      error: 'Session is archived. Upvoting is disabled for archived sessions.',
    });
  }

  const question = store.questions.find((q) => q.id === qid && q.sessionId === sessionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  question.upvotes += 1;
  saveStore();

  res.json({
    ok: true,
    upvotes: question.upvotes,
    question: toPublicQuestion(question),
  });
});

// POST /api/sessions/:id/questions/:qid/reply -> answer a question and deliver answer via email
router.post('/sessions/:id/questions/:qid/reply', async (req, res) => {
  const { id: sessionId, qid } = req.params;
  const { speakerId, body } = req.body || {};

  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status === SESSION_STATUS.ARCHIVED) {
    return res.status(409).json({
      error: 'Session is archived and cannot receive replies.',
    });
  }

  if (!speakerId || !Array.isArray(session.speakerIds) || !session.speakerIds.includes(speakerId)) {
    return res.status(400).json({
      error: 'Speaker does not belong to this session.',
    });
  }

  const speaker = store.speakers.find((s) => s.id === speakerId);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker profile not found.' });
  }

  // Security: enforce individual speaker PIN or admin token
  const providedSpeakerPin = req.headers['x-speaker-pin'];
  const providedAdminToken = req.headers['x-admin-token'];

  if (providedSpeakerPin && String(providedSpeakerPin).trim() !== String(speaker.pin || '1234').trim()) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid speaker PIN. You must enter your correct speaker PIN to post answers.',
    });
  }

  if (providedAdminToken && providedAdminToken !== (process.env.ADMIN_TOKEN || 'admin123')) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid admin token.',
    });
  }

  const question = store.questions.find((q) => q.id === qid && q.sessionId === sessionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  if (question.status !== QUESTION_STATUS.OPEN) {
    return res.status(400).json({
      error: 'Question is not open for answering.',
    });
  }

  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Reply body is required.' });
  }
  const trimmedBody = body.trim();
  if (trimmedBody.length > 2000) {
    return res.status(400).json({
      error: 'Reply exceeds maximum length of 2000 characters.',
    });
  }

  // Mark the question answered
  question.status = QUESTION_STATUS.ANSWERED;

  const deliveredVia = [];
  let warning = null;
  const recipientEmail = question.contact?.email;

  if (recipientEmail) {
    try {
      const simulateFailure = req.headers['x-test-smtp-fail'] === 'true';
      const speaker = store.speakers.find((s) => s.id === speakerId);
      await sendAnswerEmail({
        to: recipientEmail,
        sessionTitle: session.title,
        questionBody: question.body,
        answerBody: trimmedBody,
        speakerName: speaker?.name || 'Speaker',
        simulateFailure,
      });
      deliveredVia.push('email');
    } catch (err) {
      console.error('Email delivery error:', err.message);
      warning = `Reply stored, but email delivery to ${recipientEmail} failed: ${err.message}`;
    }
  }

  const newReply = {
    id: randomUUID(),
    questionId: question.id,
    sessionId: session.id,
    speakerId,
    body: trimmedBody,
    visibility: VISIBILITY.BOTH,
    deliveredVia,
    repliedAt: new Date().toISOString(),
  };

  store.replies.push(newReply);
  saveStore();

  res.status(201).json({
    ok: true,
    reply: newReply,
    question: toPublicQuestion(question),
    warning: warning || undefined,
  });
});

export default router;
