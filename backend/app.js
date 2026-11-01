const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
require('./passport');

const prod = process.env.NODE_ENV === 'production';
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));

const sessionMiddleware = session({
  store: new PgStore({ pool: new Pool({ connectionString: process.env.DATABASE_URL }), createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, secure: prod, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 }
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// CSRF defence: state-changing API calls must come from our own origin
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && process.env.APP_BASE_URL && origin !== process.env.APP_BASE_URL.replace(/\/$/, '')) return res.status(403).json({ error: 'Bad origin' });
  next();
});
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 }));

app.get('/health', (req, res) => res.send('ok'));
app.get('/api/config', (req, res) => res.json({ supportEmail: process.env.SUPPORT_EMAIL || null, googleEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) }));
app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'), { maxAge: '7d' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/market'));
app.use('/api', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'] }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/home.html')));
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' }); });

module.exports = { app, sessionMiddleware };
