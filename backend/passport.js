const passport = require('passport');
const { Strategy: Local } = require('passport-local');
const Google = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

passport.use(new Local({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const u = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!u || !u.passwordHash || !(await bcrypt.compare(password, u.passwordHash))) return done(null, false);
    done(null, u);
  } catch (e) { done(e); }
}));

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new Google({
    clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (at, rt, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      if (!email) return done(null, false);
      let u = await prisma.user.findFirst({ where: { OR: [{ googleId: profile.id }, { email }] } });
      if (!u) u = await prisma.user.create({ data: { email, name: profile.displayName || email, googleId: profile.id } });
      else if (!u.googleId) u = await prisma.user.update({ where: { id: u.id }, data: { googleId: profile.id } });
      done(null, u);
    } catch (e) { done(e); }
  }));
}

passport.serializeUser((u, done) => done(null, u.id));
passport.deserializeUser(async (id, done) => {
  try {
    const u = await prisma.user.findUnique({ where: { id } });
    done(null, u && u.status === 'ACTIVE' ? u : false);
  } catch (e) { done(e); }
});
