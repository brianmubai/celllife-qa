import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import speakersRouter from './routes/speakers.js';
import sessionsRouter from './routes/sessions.js';
import questionsRouter from './routes/questions.js';
import archiveRouter from './routes/archive.js';
import sponsorsRouter from './routes/sponsors.js';
import { store, saveStore } from './store.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Restrict CORS to configured frontend origin(s) via environment variable + local LAN for mobile testing
const defaultOrigins = [
  'http://localhost:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5173',
  'http://192.168.43.102:5174',
];
const envOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (curl, server scripts, automated tests)
    if (!origin) return callback(null, true);
    let originHostname = '';
    try {
      originHostname = new URL(origin).hostname;
    } catch {
      originHostname = '';
    }

    if (
      allowedOrigins.includes(normalizedOrigin) ||
      /\.(onrender\.com|railway\.app|cellife\.co\.zw)$/.test(originHostname) ||
      originHostname === 'cellife.co.zw' ||
      /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// 2. Add basic rate limiting on POST routes (express-rate-limit)
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 POST requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use((req, res, next) => {
  if (req.method === 'POST') {
    return postLimiter(req, res, next);
  }
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Admin Data Reset
app.post('/api/admin/reset-data', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN || 'admin123';
  if (req.headers['x-admin-token'] !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin token' });
  }
  store.speakers.length = 0;
  store.sessions.length = 0;
  store.questions.length = 0;
  store.replies.length = 0;
  store.sponsors.length = 0;
  saveStore();
  console.log('[DATA RESET] All speakers, sessions, questions, and replies cleared.');
  res.json({
    ok: true,
    message: 'All data has been cleared successfully. Ready for a new session.',
  });
});

// Routes
app.use('/api', speakersRouter);
app.use('/api', sessionsRouter);
app.use('/api', questionsRouter);
app.use('/api', archiveRouter);
app.use('/api', sponsorsRouter);

// 3. Serve production frontend build from dist if present
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

