import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

/**
 * File-backed persistent data store for qa-app / cellLife.
 * Automatically saves on mutations and reloads on startup.
 */

export const speakers = [];
export const sessions = [];
export const questions = [];
export const replies = [];
export const sponsors = [];

export const store = {
  speakers,
  sessions,
  questions,
  replies,
  sponsors,
};

const INITIAL_STORE = {
  speakers: [
    {
      id: 'spk-gerald-manyida',
      name: 'Gerald Manyida',
      title: 'Facilitator',
      topic: 'Shepherding Through Connection - Back to Basics',
      bio: 'CellLife Training Leader & Facilitator',
      email: 'gerald.manyida@cellife.co.zw',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      pin: '1234',
    },
    {
      id: 'spk-sister-takura',
      name: 'Sister Takura',
      title: 'Facilitator',
      topic: 'Shepherding Through Connection',
      bio: 'CellLife Ministry Leader',
      email: 'takura@cellife.co.zw',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      pin: '1234',
    },
    {
      id: 'spk-pastor-nyatsanza',
      name: 'Pastor I Nyatsanza',
      title: 'Pastor',
      topic: 'Biblical Foundations of Shepherding',
      bio: 'Pastoral Oversight & Spiritual Guidance',
      email: 'pastor.nyatsanza@cellife.co.zw',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      pin: '1234',
    },
    {
      id: 'spk-aunt-edna',
      name: 'Aunt Edna',
      title: 'Facilitator',
      topic: 'Relational Shepherding & Care',
      bio: 'Community Support & Care Ministry',
      email: 'eddah.mhute@celebrate.org',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
      pin: '1234',
    },
  ],
  sponsors: [],
  sessions: [
    {
      id: 'sess-cellife-14-oct',
      title: 'CELLIFE TRAINING - SHEPHERDING THROUGH CONNECTION',
      date: '2026-10-14',
      status: 'live',
      speakerIds: [
        'spk-gerald-manyida',
        'spk-sister-takura',
        'spk-pastor-nyatsanza',
        'spk-aunt-edna',
      ],
      sponsorIds: [],
      branding: {
        primaryColor: '#1F6F5C',
        accentColor: '#F4B942',
        emoji: '🌱',
        tagline: 'Back to Basics: Shepherding Through Connection',
        bannerUrl: null,
      },
      createdAt: '2026-10-14T08:00:00.000Z',
    },
  ],
  questions: [],
  replies: [],
};

/**
 * Save current state to JSON file
 */
export const saveStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      speakers: store.speakers,
      sessions: store.sessions,
      questions: store.questions,
      replies: store.replies,
      sponsors: store.sponsors,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving store to disk:', err);
  }
};

/**
 * Load state from JSON file or initialize with seed data
 */
export const loadStore = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);

      store.speakers.length = 0;
      store.sessions.length = 0;
      store.questions.length = 0;
      store.replies.length = 0;
      store.sponsors.length = 0;

      if (Array.isArray(data.speakers)) store.speakers.push(...data.speakers);
      if (Array.isArray(data.sessions)) store.sessions.push(...data.sessions);
      if (Array.isArray(data.questions)) store.questions.push(...data.questions);
      if (Array.isArray(data.replies)) store.replies.push(...data.replies);
      if (Array.isArray(data.sponsors)) store.sponsors.push(...data.sponsors);
      return;
    }

    // No existing file -> populate with initial store
    store.speakers.push(...INITIAL_STORE.speakers);
    store.sessions.push(...INITIAL_STORE.sessions);
    store.questions.push(...INITIAL_STORE.questions);
    store.replies.push(...INITIAL_STORE.replies);
    store.sponsors.push(...INITIAL_STORE.sponsors);
    saveStore();
  } catch (err) {
    console.error('Error loading store from disk, falling back to initial data:', err);
    store.speakers.push(...INITIAL_STORE.speakers);
    store.sessions.push(...INITIAL_STORE.sessions);
    store.questions.push(...INITIAL_STORE.questions);
    store.replies.push(...INITIAL_STORE.replies);
    store.sponsors.push(...INITIAL_STORE.sponsors);
  }
};

// Initial load on server startup
loadStore();
