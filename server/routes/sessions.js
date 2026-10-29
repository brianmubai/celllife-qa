import express from 'express';
import { randomUUID } from 'crypto';
import { store, saveStore } from '../store.js';
import { SESSION_STATUS, DEFAULT_BRANDING, QUESTION_STATUS } from '../../src/models/types.js';
import { requireAdmin, toPublicSpeaker } from './speakers.js';
import { sendArchiveNotificationEmail } from '../services/email.js';
import { toPublicSponsor, sortSponsorsByTier } from './sponsors.js';

const router = express.Router();

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// Helper: sanitize branding configuration
const sanitizeBranding = (input = {}) => {
  const primaryColor =
    typeof input.primaryColor === 'string' && HEX_COLOR_REGEX.test(input.primaryColor.trim())
      ? input.primaryColor.trim()
      : DEFAULT_BRANDING.primaryColor;

  const accentColor =
    typeof input.accentColor === 'string' && HEX_COLOR_REGEX.test(input.accentColor.trim())
      ? input.accentColor.trim()
      : DEFAULT_BRANDING.accentColor;

  const rawEmoji = typeof input.emoji === 'string' ? input.emoji.trim() : '';
  const emoji =
    rawEmoji.length > 0
      ? Array.from(rawEmoji).slice(0, 2).join('')
      : DEFAULT_BRANDING.emoji;

  const rawTagline = typeof input.tagline === 'string' ? input.tagline.trim() : '';
  const tagline = rawTagline.slice(0, 120);

  const bannerUrl =
    typeof input.bannerUrl === 'string' && input.bannerUrl.trim().startsWith('https://')
      ? input.bannerUrl.trim()
      : null;

  return {
    primaryColor,
    accentColor,
    emoji,
    tagline,
    bannerUrl,
  };
};

// Helper: hydrate session with sanitized public speaker and sponsor objects
const hydrateSession = (session) => {
  const speakers = (session.speakerIds || [])
    .map((id) => store.speakers.find((s) => s.id === id))
    .filter(Boolean)
    .map(toPublicSpeaker);

  const sponsors = (session.sponsorIds || [])
    .map((id) => store.sponsors.find((s) => s.id === id))
    .filter(Boolean)
    .map(toPublicSponsor);

  const sortedSponsors = sortSponsorsByTier(sponsors);

  return {
    ...session,
    sponsorIds: session.sponsorIds || [],
    speakers,
    sponsors: sortedSponsors,
  };
};

/* ==========================================================================
   Session Routes
   ========================================================================== */

// GET /api/sessions -> returns { active, past }
router.get('/sessions', (req, res) => {
  const active = store.sessions
    .filter(
      (s) =>
        s.status === SESSION_STATUS.UPCOMING || s.status === SESSION_STATUS.LIVE
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(hydrateSession);

  const past = store.sessions
    .filter((s) => s.status === SESSION_STATUS.ARCHIVED)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(hydrateSession);

  res.json({ active, past });
});

// GET /api/sessions/:id -> returns the session with public speakers only
router.get('/sessions/:id', (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(hydrateSession(session));
});

// POST /api/sessions -> create new session
router.post('/sessions', (req, res) => {
  const { title, date, speakerIds, branding } = req.body || {};
  const errors = [];

  if (typeof title !== 'string' || !title.trim()) {
    errors.push('Session title is required');
  }

  if (typeof date !== 'string' || !date.trim() || isNaN(Date.parse(date))) {
    errors.push('Valid session date is required');
  }

  if (!Array.isArray(speakerIds) || speakerIds.length === 0) {
    errors.push('At least one speaker is required');
  }

  // Filter only speakerIds that actually exist in store.speakers
  const validSpeakerIds = Array.isArray(speakerIds)
    ? speakerIds.filter((id) => store.speakers.some((s) => s.id === id))
    : [];

  if (Array.isArray(speakerIds) && speakerIds.length > 0 && validSpeakerIds.length === 0) {
    errors.push('At least one specified speaker must exist');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const newSession = {
    id: randomUUID(),
    title: title.trim(),
    date: date.trim(),
    status: SESSION_STATUS.UPCOMING,
    speakerIds: validSpeakerIds,
    sponsorIds: Array.isArray(req.body?.sponsorIds) ? req.body.sponsorIds : [],
    branding: sanitizeBranding(branding),
    createdAt: new Date().toISOString(),
  };

  store.sessions.push(newSession);
  saveStore();
  res.status(201).json(hydrateSession(newSession));
});

// POST /api/sessions/:id/advance -> moves upcoming to live, and live to archived (409 if archived)
router.post('/sessions/:id/advance', (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status === SESSION_STATUS.ARCHIVED) {
    return res.status(409).json({
      error: 'Session is already archived and cannot be advanced further.',
    });
  }

  if (session.status === SESSION_STATUS.UPCOMING) {
    session.status = SESSION_STATUS.LIVE;
  } else if (session.status === SESSION_STATUS.LIVE) {
    session.status = SESSION_STATUS.ARCHIVED;
  }
  saveStore();

  res.json(hydrateSession(session));
});

// POST /api/sessions/:id/close-out (admin only): marks all remaining open questions "unanswered" and returns them
router.post('/sessions/:id/close-out', requireAdmin, (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Find remaining open questions for this session
  const openQuestions = store.questions.filter(
    (q) => q.sessionId === req.params.id && q.status === QUESTION_STATUS.OPEN
  );

  // Mark all remaining open questions "unanswered"
  for (const q of openQuestions) {
    q.status = QUESTION_STATUS.UNANSWERED;
  }
  saveStore();

  res.json(openQuestions);
});

// POST /api/sessions/:id/notify-archive (admin only): emails opted-in askers with link to archive page
router.post('/sessions/:id/notify-archive', requireAdmin, async (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Only send to askers who gave an email and opted in to the archive (archive === true)
  const eligibleQuestions = store.questions.filter(
    (q) =>
      q.sessionId === req.params.id &&
      q.archive === true &&
      q.contact &&
      typeof q.contact.email === 'string' &&
      q.contact.email.trim()
  );

  // Deduplicate by recipient email
  const recipientMap = new Map();
  for (const q of eligibleQuestions) {
    const email = q.contact.email.trim().toLowerCase();
    if (!recipientMap.has(email)) {
      recipientMap.set(email, {
        email,
        askerName: q.askerName || 'Participant',
      });
    }
  }

  const recipients = Array.from(recipientMap.values());
  let notifiedCount = 0;
  const appOrigin = req.headers.origin || 'http://localhost:5174';
  const archiveUrl = `${appOrigin}/#archive`;

  for (const recipient of recipients) {
    try {
      await sendArchiveNotificationEmail({
        to: recipient.email,
        sessionTitle: session.title,
        archiveUrl,
        recipientName: recipient.askerName,
      });
      notifiedCount++;
    } catch (err) {
      console.error(`Failed sending archive notice to ${recipient.email}:`, err);
    }
  }

  res.json({
    notifiedCount,
    totalEligible: recipients.length,
    message: `Notified ${notifiedCount} of ${recipients.length} participant(s).`,
  });
});

export default router;

