import express from 'express';
import { randomUUID } from 'crypto';
import { store, saveStore } from '../store.js';
import { SPONSOR_TIER, SPONSOR_LIMITS, SESSION_STATUS } from '../../src/models/types.js';
import { requireAdmin } from './speakers.js';

const router = express.Router();

export const toPublicSponsor = (sponsor) => {
  const { contactEmail, ...publicData } = sponsor;
  return publicData;
};

const TIER_ORDER = {
  [SPONSOR_TIER.TITLE]: 1,
  [SPONSOR_TIER.GOLD]: 2,
  [SPONSOR_TIER.SUPPORTING]: 3,
};

export const sortSponsorsByTier = (sponsorsList) => {
  return [...sponsorsList].sort((a, b) => {
    const orderA = TIER_ORDER[a.tier] || 99;
    const orderB = TIER_ORDER[b.tier] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
};

const validateSponsor = (data) => {
  const errors = [];
  let { name, tier, logoUrl, websiteUrl, blurb, contactEmail } = data;

  if (typeof name !== 'string' || !name.trim()) {
    errors.push('Sponsor name is required');
  } else {
    name = name.trim();
    if (name.length > SPONSOR_LIMITS.name) {
      errors.push(`Name exceeds maximum of ${SPONSOR_LIMITS.name} characters`);
    }
  }

  const validTiers = Object.values(SPONSOR_TIER);
  if (!tier || !validTiers.includes(tier)) {
    tier = SPONSOR_TIER.SUPPORTING;
  }

  if (typeof contactEmail !== 'string' || !contactEmail.trim()) {
    errors.push('Valid contact email is required');
  } else {
    contactEmail = contactEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      errors.push('Valid contact email format is required');
    }
  }

  if (blurb !== undefined && blurb !== null) {
    blurb = String(blurb).trim();
    if (blurb.length > SPONSOR_LIMITS.blurb) {
      errors.push(`Blurb exceeds maximum of ${SPONSOR_LIMITS.blurb} characters`);
    }
  } else {
    blurb = '';
  }

  if (typeof logoUrl === 'string' && logoUrl.trim().startsWith('https://')) {
    logoUrl = logoUrl.trim();
  } else {
    logoUrl = null;
  }

  if (typeof websiteUrl === 'string' && websiteUrl.trim().startsWith('https://')) {
    websiteUrl = websiteUrl.trim();
  } else {
    websiteUrl = null;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      name,
      tier,
      logoUrl,
      websiteUrl,
      blurb,
      contactEmail,
    },
  };
};

/* ==========================================================================
   Public Routes
   ========================================================================== */

// GET /api/sponsors -> returns list of all sponsors (no contactEmail)
router.get('/sponsors', (req, res) => {
  const publicList = store.sponsors.map(toPublicSponsor);
  res.json(sortSponsorsByTier(publicList));
});

// GET /api/sponsors/:id -> returns the sponsor without contactEmail
router.get('/sponsors/:id', (req, res) => {
  const sponsor = store.sponsors.find((s) => s.id === req.params.id);
  if (!sponsor) {
    return res.status(404).json({ error: 'Sponsor not found' });
  }
  res.json(toPublicSponsor(sponsor));
});

/* ==========================================================================
   Admin Routes
   ========================================================================== */

// GET /api/admin/sponsors -> returns sponsors including contactEmail
router.get('/admin/sponsors', requireAdmin, (req, res) => {
  res.json(sortSponsorsByTier(store.sponsors));
});

// POST /api/admin/sponsors -> create sponsor
router.post('/admin/sponsors', requireAdmin, (req, res) => {
  const { isValid, errors, sanitized } = validateSponsor(req.body || {});
  if (!isValid) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const newSponsor = {
    id: randomUUID(),
    ...sanitized,
  };

  store.sponsors.push(newSponsor);
  saveStore();
  res.status(201).json(newSponsor);
});

// PUT /api/admin/sponsors/:id -> update sponsor
router.put('/admin/sponsors/:id', requireAdmin, (req, res) => {
  const sponsor = store.sponsors.find((s) => s.id === req.params.id);
  if (!sponsor) {
    return res.status(404).json({ error: 'Sponsor not found' });
  }

  const { isValid, errors, sanitized } = validateSponsor(req.body || {});
  if (!isValid) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  Object.assign(sponsor, sanitized);
  saveStore();
  res.json(sponsor);
});

// DELETE /api/admin/sponsors/:id -> delete sponsor (409 if attached to any session)
router.delete('/admin/sponsors/:id', requireAdmin, (req, res) => {
  const sponsorId = req.params.id;
  const sponsorIndex = store.sponsors.findIndex((s) => s.id === sponsorId);
  if (sponsorIndex === -1) {
    return res.status(404).json({ error: 'Sponsor not found' });
  }

  // Check if sponsor is attached to any session
  const isAttached = store.sessions.some(
    (s) => Array.isArray(s.sponsorIds) && s.sponsorIds.includes(sponsorId)
  );

  if (isAttached) {
    return res.status(409).json({
      error: 'Cannot delete sponsor: sponsor is attached to one or more sessions.',
    });
  }

  const [deleted] = store.sponsors.splice(sponsorIndex, 1);
  saveStore();
  res.json({ message: 'Sponsor deleted successfully', sponsor: deleted });
});

// PUT /api/admin/sessions/:id/sponsors -> attach sponsors to session
router.put('/admin/sessions/:id/sponsors', requireAdmin, (req, res) => {
  const session = store.sessions.find((s) => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Reject this route for archived sessions with 409
  if (session.status === SESSION_STATUS.ARCHIVED) {
    return res.status(409).json({
      error: 'Cannot modify sponsors for an archived session.',
    });
  }

  const { sponsorIds } = req.body || {};
  if (!Array.isArray(sponsorIds)) {
    return res.status(400).json({ error: 'sponsorIds must be an array' });
  }

  // Every ID must exist
  const allExist = sponsorIds.every((id) => store.sponsors.some((s) => s.id === id));
  if (!allExist) {
    return res.status(400).json({ error: 'One or more sponsor IDs do not exist' });
  }

  session.sponsorIds = Array.from(new Set(sponsorIds));
  saveStore();

  // Return session with hydrated sponsors
  const sessionSponsors = session.sponsorIds
    .map((id) => store.sponsors.find((s) => s.id === id))
    .filter(Boolean)
    .map(toPublicSponsor);

  res.json({
    ...session,
    sponsors: sortSponsorsByTier(sessionSponsors),
  });
});

export default router;
