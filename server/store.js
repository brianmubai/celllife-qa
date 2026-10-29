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
      id: 'spk-sarah-chen',
      name: 'Dr. Sarah Chen',
      title: 'Principal AI Architect',
      topic: 'Scalable LLM Orchestration',
      bio: 'Leading distributed AI engineering and multi-agent systems at scale.',
      email: 'sarah.chen@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      pin: '1234',
    },
    {
      id: 'spk-marcus-vance',
      name: 'Marcus Vance',
      title: 'VP of Platform Engineering',
      topic: 'High-Throughput Microservices & Event Streams',
      bio: 'Expert in real-time streaming architectures and resilient cloud backends.',
      email: 'marcus.vance@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      pin: '1234',
    },
    {
      id: 'spk-elena-rostova',
      name: 'Elena Rostova',
      title: 'Head of Developer Experience',
      topic: 'Modern Frontend Architecture & Web Performance',
      bio: 'Focusing on reactive UI patterns, accessibility, and high performance web apps.',
      email: 'elena.rostova@example.com',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
      pin: '1234',
    },
  ],
  sponsors: [
    {
      id: 'spon-cloudscale',
      name: 'CloudScale Systems',
      tier: 'title',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
      websiteUrl: 'https://cloudscale.example.com',
      blurb: 'Global cloud computing & enterprise scale infrastructure partner',
      contactEmail: 'sponsors@cloudscale.example.com',
    },
    {
      id: 'spon-datastream',
      name: 'DataStream Global',
      tier: 'gold',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200',
      websiteUrl: 'https://datastream.example.com',
      blurb: 'Real-time analytics and telemetry pipelines',
      contactEmail: 'partners@datastream.example.com',
    },
    {
      id: 'spon-techpulse',
      name: 'TechPulse Media',
      tier: 'supporting',
      logoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200',
      websiteUrl: 'https://techpulse.example.com',
      blurb: 'Premier media network for developer & enterprise technology',
      contactEmail: 'events@techpulse.example.com',
    },
  ],
  sessions: [
    {
      id: 'sess-archived-01',
      title: 'Enterprise Architecture & Scalable Systems Keynote',
      date: '2026-10-15',
      status: 'archived',
      speakerIds: ['spk-sarah-chen', 'spk-marcus-vance'],
      sponsorIds: ['spon-cloudscale', 'spon-datastream'],
      branding: {
        primaryColor: '#0E49B5',
        accentColor: '#38EF7D',
        emoji: '🏛️',
        tagline: 'Keynote on Distributed Cloud Architecture',
        bannerUrl: null,
      },
      createdAt: '2026-10-15T08:00:00.000Z',
    },
    {
      id: 'sess-live-02',
      title: 'Real-Time Multi-Agent Live Session',
      date: '2026-10-29',
      status: 'live',
      speakerIds: ['spk-sarah-chen', 'spk-elena-rostova'],
      sponsorIds: ['spon-cloudscale', 'spon-techpulse'],
      branding: {
        primaryColor: '#DC2626',
        accentColor: '#E5E7EB',
        emoji: '🎙️',
        tagline: 'Live Q&A Queue & Speaker Responses',
        bannerUrl: null,
      },
      createdAt: '2026-10-29T08:00:00.000Z',
    },
    {
      id: 'sess-upcoming-03',
      title: 'Future of Digital Healthcare & Community Support',
      date: '2026-11-05',
      status: 'upcoming',
      speakerIds: ['spk-marcus-vance', 'spk-elena-rostova'],
      sponsorIds: ['spon-datastream'],
      branding: {
        primaryColor: '#1F6F5C',
        accentColor: '#F4B942',
        emoji: '🌱',
        tagline: 'Community empowerment through digital tech',
        bannerUrl: null,
      },
      createdAt: '2026-10-29T08:30:00.000Z',
    },
  ],
  questions: [
    {
      id: 'q-arch-1',
      sessionId: 'sess-archived-01',
      speakerId: 'spk-sarah-chen',
      body: 'How do you handle state synchronization across distributed agent clusters?',
      askerName: 'Alex Jordan',
      contact: { email: 'alex@example.com' },
      archive: true,
      status: 'answered',
      upvotes: 14,
      createdAt: '2026-10-15T09:15:00.000Z',
    },
    {
      id: 'q-arch-2',
      sessionId: 'sess-archived-01',
      speakerId: 'spk-marcus-vance',
      body: 'What are the biggest architectural bottlenecks when deploying high-throughput event streams in multi-cloud environments?',
      askerName: 'Taylor Morgan',
      contact: { email: 'taylor@example.com' },
      archive: true,
      status: 'answered',
      upvotes: 9,
      createdAt: '2026-10-15T09:30:00.000Z',
    },
    {
      id: 'q-arch-3',
      sessionId: 'sess-archived-01',
      speakerId: null,
      body: 'How do you mitigate cascading failures in microservice tool calls during traffic surges?',
      askerName: 'Bob Engineer',
      contact: { email: 'bob@example.com' },
      archive: true,
      status: 'answered',
      upvotes: 7,
      createdAt: '2026-10-15T10:00:00.000Z',
    },
    {
      id: 'q-live-1',
      sessionId: 'sess-live-02',
      speakerId: 'spk-sarah-chen',
      body: 'What are the latency considerations when streaming multi-turn reasoning traces to the browser?',
      askerName: 'Samantha Green',
      contact: { email: 'samantha@example.com' },
      archive: true,
      status: 'open',
      upvotes: 5,
      createdAt: '2026-10-29T08:45:00.000Z',
    },
    {
      id: 'q-live-2',
      sessionId: 'sess-live-02',
      speakerId: null,
      body: 'Will the session recording and slides be published in the public archive after this event?',
      askerName: 'Tendai M.',
      contact: { email: 'tendai@example.com' },
      archive: true,
      status: 'open',
      upvotes: 3,
      createdAt: '2026-10-29T08:50:00.000Z',
    },
  ],
  replies: [
    {
      id: 'rep-1',
      questionId: 'q-arch-1',
      sessionId: 'sess-archived-01',
      speakerId: 'spk-sarah-chen',
      body: 'We employ optimistic CRDTs combined with centralized Raft-coordinated metadata nodes, allowing cluster nodes to reconcile disconnected states within 50ms.',
      visibility: 'both',
      deliveredVia: ['email'],
      repliedAt: '2026-10-15T09:25:00.000Z',
    },
    {
      id: 'rep-2',
      questionId: 'q-arch-2',
      sessionId: 'sess-archived-01',
      speakerId: 'spk-marcus-vance',
      body: 'Cross-region network egress latency and partition rebalancing are typical bottlenecks. Partitioning by tenant hash with localized Kafka brokers alleviates 90% of cross-cloud serialization lag.',
      visibility: 'both',
      deliveredVia: ['email'],
      repliedAt: '2026-10-15T09:40:00.000Z',
    },
    {
      id: 'rep-3',
      questionId: 'q-arch-3',
      sessionId: 'sess-archived-01',
      speakerId: 'spk-marcus-vance',
      body: 'Implement circuit breakers with exponential backoff and localized fallback caches so failures remain isolated rather than taking down downstream subscribers.',
      visibility: 'both',
      deliveredVia: ['email'],
      repliedAt: '2026-10-15T10:15:00.000Z',
    },
  ],
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
