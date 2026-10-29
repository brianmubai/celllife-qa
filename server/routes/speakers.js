import express from 'express';
import { randomUUID } from 'crypto';
import { store, saveStore } from '../store.js';
import { SPEAKER_LIMITS } from '../../src/models/types.js';
import { sendSpeakerPinRecoveryEmail } from '../services/email.js';

const router = express.Router();

// Middleware: compares x-admin-token to process.env.ADMIN_TOKEN
export const requireAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin token' });
  }
  next();
};

// Helper: strips private fields (email and pin) from speaker object for public views
export const toPublicSpeaker = (speaker) => {
  const { email, pin, ...publicData } = speaker;
  return publicData;
};

// Helper: validates and sanitizes speaker payload
const validateSpeaker = (data) => {
  const errors = [];
  let { name, topic, email, title, bio, photoUrl, pin } = data;

  if (typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required');
  } else {
    name = name.trim();
    if (name.length > SPEAKER_LIMITS.name) {
      errors.push(`Name exceeds maximum length of ${SPEAKER_LIMITS.name} characters`);
    }
  }

  if (typeof topic !== 'string' || !topic.trim()) {
    errors.push('Topic is required');
  } else {
    topic = topic.trim();
    if (topic.length > SPEAKER_LIMITS.topic) {
      errors.push(`Topic exceeds maximum length of ${SPEAKER_LIMITS.topic} characters`);
    }
  }

  if (typeof email !== 'string' || !email.trim()) {
    errors.push('Valid email is required');
  } else {
    email = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Valid email format is required');
    }
  }

  if (title !== undefined && title !== null) {
    title = String(title).trim();
    if (title.length > SPEAKER_LIMITS.title) {
      errors.push(`Title exceeds maximum length of ${SPEAKER_LIMITS.title} characters`);
    }
  } else {
    title = '';
  }

  if (bio !== undefined && bio !== null) {
    bio = String(bio).trim();
    if (bio.length > SPEAKER_LIMITS.bio) {
      errors.push(`Bio exceeds maximum length of ${SPEAKER_LIMITS.bio} characters`);
    }
  } else {
    bio = '';
  }

  if (typeof photoUrl === 'string' && photoUrl.trim().startsWith('https://')) {
    photoUrl = photoUrl.trim();
  } else {
    photoUrl = null;
  }

  // Sanitize speaker PIN (defaults to 1234 if empty)
  let cleanPin = pin !== undefined && pin !== null ? String(pin).trim() : '1234';
  if (!cleanPin) {
    cleanPin = '1234';
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: { name, topic, email, title, bio, photoUrl, pin: cleanPin },
  };
};

/* ==========================================================================
   Public & Speaker Auth Routes
   ========================================================================== */

// GET /api/speakers (no emails, no pins)
router.get('/speakers', (req, res) => {
  const publicList = store.speakers.map(toPublicSpeaker);
  res.json(publicList);
});

// GET /api/speakers/:id (no email, no pin)
router.get('/speakers/:id', (req, res) => {
  const speaker = store.speakers.find((s) => s.id === req.params.id);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }
  res.json(toPublicSpeaker(speaker));
});

// POST /api/speakers/verify-pin: validates speaker credentials
router.post('/speakers/verify-pin', (req, res) => {
  const { speakerId, pin } = req.body || {};
  if (!speakerId || !pin) {
    return res.status(400).json({ error: 'Speaker selection and PIN are required.' });
  }

  const speaker = store.speakers.find((s) => s.id === speakerId);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker profile not found.' });
  }

  const enteredPin = String(pin).trim();
  const actualPin = String(speaker.pin || '1234').trim();

  if (enteredPin !== actualPin) {
    return res.status(401).json({ error: 'Incorrect PIN for this speaker.' });
  }

  res.json({
    ok: true,
    speaker: toPublicSpeaker(speaker),
    token: `spk_token_${speaker.id}_${Date.now()}`,
  });
});

// POST /api/speakers/forgot-pin: emails recovery PIN to speaker
router.post('/speakers/forgot-pin', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Speaker email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const speaker = store.speakers.find(
    (s) => s.email && s.email.trim().toLowerCase() === cleanEmail
  );

  if (!speaker) {
    return res.status(404).json({
      error: 'No speaker found registered with that email address.',
    });
  }

  const speakerPin = speaker.pin || '1234';

  try {
    await sendSpeakerPinRecoveryEmail({
      to: speaker.email,
      speakerName: speaker.name,
      pin: speakerPin,
    });

    return res.json({
      ok: true,
      message: `Your secret access PIN has been dispatched to ${speaker.email}.`,
    });
  } catch (err) {
    console.error('Failed sending PIN recovery email:', err);
    return res.status(500).json({
      error: 'Failed to dispatch PIN recovery email. Please try again.',
    });
  }
});

/* ==========================================================================
   Admin Routes
   ========================================================================== */

// GET /api/admin/speakers (includes emails)
router.get('/admin/speakers', requireAdmin, (req, res) => {
  res.json(store.speakers);
});

// POST /api/admin/speakers
router.post('/admin/speakers', requireAdmin, (req, res) => {
  const { isValid, errors, sanitized } = validateSpeaker(req.body || {});
  if (!isValid) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const newSpeaker = {
    id: randomUUID(),
    ...sanitized,
  };

  store.speakers.push(newSpeaker);
  saveStore();
  res.status(201).json(newSpeaker);
});

// PUT /api/admin/speakers/:id
router.put('/admin/speakers/:id', requireAdmin, (req, res) => {
  const speaker = store.speakers.find((s) => s.id === req.params.id);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  const { isValid, errors, sanitized } = validateSpeaker(req.body || {});
  if (!isValid) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  Object.assign(speaker, sanitized);
  saveStore();
  res.json(speaker);
});

// DELETE /api/admin/speakers/:id
router.delete('/admin/speakers/:id', requireAdmin, (req, res) => {
  const speakerId = req.params.id;
  const speakerIndex = store.speakers.findIndex((s) => s.id === speakerId);
  if (speakerIndex === -1) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  // Returns 409 if the speaker is assigned to any session
  const isAssigned = store.sessions.some(
    (session) => Array.isArray(session.speakerIds) && session.speakerIds.includes(speakerId)
  );

  if (isAssigned) {
    return res.status(409).json({
      error: 'Speaker is assigned to one or more sessions and cannot be deleted.',
    });
  }

  store.speakers.splice(speakerIndex, 1);
  saveStore();
  res.json({ ok: true, message: 'Speaker deleted successfully' });
});

// Helper route to assign speaker to a test session (for Phase 2 409 conflict verification)
router.post('/admin/test-session/assign', requireAdmin, (req, res) => {
  const { speakerId } = req.body;
  if (!speakerId) {
    return res.status(400).json({ error: 'speakerId is required' });
  }
  const session = {
    id: `test-session-${Date.now()}`,
    title: 'Training Session Demo',
    date: '2026-10-15',
    status: 'upcoming',
    speakerIds: [speakerId],
    branding: null,
    createdAt: new Date().toISOString(),
  };
  store.sessions.push(session);
  saveStore();
  res.json({ ok: true, session });
});

// Helper route to unassign speaker / clear test sessions
router.post('/admin/test-session/clear', requireAdmin, (req, res) => {
  const { speakerId } = req.body;
  if (speakerId) {
    for (let i = store.sessions.length - 1; i >= 0; i--) {
      if (store.sessions[i].speakerIds && store.sessions[i].speakerIds.includes(speakerId)) {
        store.sessions.splice(i, 1);
      }
    }
  } else {
    store.sessions.length = 0;
  }
  saveStore();
  res.json({ ok: true });
});

export default router;
