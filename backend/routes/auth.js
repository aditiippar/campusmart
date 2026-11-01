const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { requireAuth, wrap, publicUser } = require('../middleware');

const safeNext = n => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//')) ? n : '/marketplace';

router.post('/register', wrap(async (req, res) => {
  const { name, email, password, college } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8) return res.status(400).json({ error: 'Name, valid email and 8+ character password required' });
  const em = email.toLowerCase().trim();
  if (await prisma.user.findUnique({ where: { email: em } })) return res.status(409).json({ error: 'Email already registered' });
  const u = await prisma.user.create({ data: { name: name.trim().slice(0, 80), email: em, college: (college || '').slice(0, 120) || null, passwordHash: await bcrypt.hash(password, 12) } });
  req.login(u, err => err ? res.status(500).json({ error: 'Login failed' }) : res.json(publicUser(u)));
}));
router.post('/login', passport.authenticate('local'), (req, res) => res.json(publicUser(req.user)));
router.post('/logout', (req, res, next) => req.logout(e => e ? next(e) : req.session.destroy(() => res.json({ ok: true }))));
router.get('/me', (req, res) => res.json(req.isAuthenticated() ? publicUser(req.user) : null));
router.patch('/me', requireAuth, wrap(async (req, res) => {
  const { name, college, department, year, phone } = req.body;
  const u = await prisma.user.update({ where: { id: req.user.id }, data: { name: name?.slice(0, 80) || undefined, college: college?.slice(0, 120), department: department?.slice(0, 80), year: Number.isInteger(year) ? year : undefined, phone: phone?.slice(0, 20) } });
  res.json(publicUser(u));
}));

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).send('Google sign-in is not configured on this server.');
  req.session.next = safeNext(req.query.next);
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', keepSessionInfo: true }), (req, res) => res.redirect(safeNext(req.session.next)));
module.exports = router;
