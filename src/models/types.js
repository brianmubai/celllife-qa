/**
 * Shared Data Model and Enums for qa-app (Frontend & Server)
 *
 * Models:
 * - Session: { id, title, date, status: "upcoming"|"live"|"archived", speakerIds: string[], branding, createdAt }
 * - Speaker: { id, name, title, topic, bio, photoUrl, email } // email is admin-only
 * - Question: { id, sessionId, speakerId: string|null, body, askerName: string|null, contact: { email: string|null }, archive: boolean, status: "open"|"answered"|"unanswered", upvotes: number, createdAt }
 * - Reply: { id, questionId, sessionId, speakerId, body, visibility: "both", deliveredVia: ["email"], repliedAt }
 * - Branding: { primaryColor, accentColor, emoji, tagline, bannerUrl }
 */

export const SESSION_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  ARCHIVED: 'archived',
};

export const QUESTION_STATUS = {
  OPEN: 'open',
  ANSWERED: 'answered',
  UNANSWERED: 'unanswered',
};

export const VISIBILITY = {
  BOTH: 'both',
};

export const ANY_SPEAKER = null;

export const DEFAULT_BRANDING = {
  primaryColor: '#DC2626',
  accentColor: '#E5E7EB',
  emoji: '🎯',
  tagline: '',
  bannerUrl: null,
};

export const BRAND_PRESETS = {
  'Crimson Light': {
    primaryColor: '#DC2626',
    accentColor: '#E2E8F0',
    emoji: '🎯',
    tagline: '',
    bannerUrl: null,
  },
  'Slate Red': {
    primaryColor: '#B91C1C',
    accentColor: '#CBD5E1',
    emoji: '⚡',
    tagline: '',
    bannerUrl: null,
  },
  'Minimalist Red': {
    primaryColor: '#EF4444',
    accentColor: '#F1F5F9',
    emoji: '🔥',
    tagline: '',
    bannerUrl: null,
  },
};

export const SPEAKER_LIMITS = {
  name: 80,
  title: 80,
  topic: 80,
  bio: 500,
};

export const SPONSOR_TIER = {
  TITLE: 'title',
  GOLD: 'gold',
  SUPPORTING: 'supporting',
};

export const SPONSOR_LIMITS = {
  name: 80,
  blurb: 160,
};

export const SPONSOR_TIER_ORDER = {
  title: 1,
  gold: 2,
  supporting: 3,
};

