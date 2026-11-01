const http = require('http');
const bcrypt = require('bcryptjs');

const required = ['DATABASE_URL', 'SESSION_SECRET', 'APP_BASE_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.error('Missing required env vars: ' + missing.join(', ')); process.exit(1); }

const prisma = require('./prisma');
const { app, sessionMiddleware } = require('./app');
const server = http.createServer(app);
require('./socket')(server, sessionMiddleware);

async function bootstrapAdmin() {
  const { ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_INITIAL_PASSWORD) return console.log('Admin bootstrap skipped (ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD not set).');
  if (await prisma.user.findFirst({ where: { role: 'ADMIN' } })) return;
  await prisma.user.create({ data: { email: ADMIN_EMAIL.toLowerCase(), name: 'CampusMart Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(ADMIN_INITIAL_PASSWORD, 12) } });
  console.log('Initial admin created. Remove ADMIN_INITIAL_PASSWORD from your environment now.');
}

bootstrapAdmin().then(() => server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('CampusMart running on port ' + (process.env.PORT || 3000))));
