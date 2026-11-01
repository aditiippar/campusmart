const router = require('express').Router();
const prisma = require('../prisma');
const { requireAdmin, wrap, notify } = require('../middleware');
router.use(requireAdmin);
const log = (req, action, target) => prisma.auditLog.create({ data: { adminId: req.user.id, action, target } });

router.get('/stats', wrap(async (req, res) => {
  const week = new Date(Date.now() - 7 * 864e5);
  const [users, newUsers, active, sellers, buyers, products, activeL, sold, pending, completed, rp, rs] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { createdAt: { gte: week } } }), prisma.user.count({ where: { lastSeenAt: { gte: week } } }),
    prisma.user.count({ where: { products: { some: {} } } }), prisma.user.count({ where: { buyOrders: { some: {} } } }),
    prisma.product.count(), prisma.product.count({ where: { status: 'AVAILABLE' } }), prisma.product.count({ where: { status: 'SOLD' } }),
    prisma.order.count({ where: { status: 'PENDING' } }), prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.report.count({ where: { status: 'OPEN', productId: { not: null } } }), prisma.user.count({ where: { reportsAgainst: { some: { status: 'OPEN' } } } })]);
  res.json({ users, newUsers, active, sellers, buyers, products, activeL, sold, pending, completed, reportedProducts: rp, reportedSellers: rs });
}));
router.get('/users', wrap(async (req, res) => {
  const q = req.query.q;
  res.json(await prisma.user.findMany({ where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { createdAt: 'desc' }, take: 100,
    select: { id: true, name: true, email: true, college: true, role: true, status: true, warnings: true, createdAt: true, _count: { select: { products: true } } } }));
}));
router.patch('/users/:id', wrap(async (req, res) => {
  const { status, warn } = req.body;
  const t = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!t || t.role === 'ADMIN') return res.status(400).json({ error: 'Cannot modify this user' });
  const data = {};
  if (['ACTIVE', 'SUSPENDED', 'BLOCKED'].includes(status)) data.status = status;
  if (warn) { data.warnings = { increment: 1 }; await notify(prisma, t.id, 'You received a warning from CampusMart moderators.', '/help'); }
  await prisma.user.update({ where: { id: t.id }, data });
  await log(req, warn ? 'WARN_USER' : 'SET_USER_' + status, t.id);
  res.json({ ok: true });
}));
router.get('/products', wrap(async (req, res) => {
  const { q, category, flagged } = req.query;
  const where = {};
  if (q) where.title = { contains: q, mode: 'insensitive' };
  if (category) where.category = category;
  if (flagged === '1') where.priceFlagged = true;
  res.json(await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { seller: { select: { name: true } } } }));
}));
router.patch('/products/:id', wrap(async (req, res) => {
  const { status } = req.body;
  if (!['AVAILABLE', 'HIDDEN', 'REMOVED'].includes(status)) return res.status(400).json({ error: 'Bad status' });
  const p = await prisma.product.update({ where: { id: req.params.id }, data: { status, priceFlagged: false } });
  await notify(prisma, p.sellerId, `Your listing "${p.title}" was set to ${status} by a moderator.`, '/my-listings');
  await log(req, 'SET_PRODUCT_' + status, p.id);
  res.json({ ok: true });
}));
router.get('/reports', wrap(async (req, res) => res.json(await prisma.report.findMany({ orderBy: { createdAt: 'desc' }, take: 100,
  include: { reporter: { select: { name: true } }, product: { select: { id: true, title: true } }, seller: { select: { id: true, name: true } } } }))));
router.patch('/reports/:id', wrap(async (req, res) => {
  if (!['REVIEWED', 'DISMISSED'].includes(req.body.status)) return res.status(400).json({ error: 'Bad status' });
  const r = await prisma.report.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  await notify(prisma, r.reporterId, 'Your report was reviewed by moderators.', '/notifications');
  await log(req, 'REPORT_' + req.body.status, r.id);
  res.json({ ok: true });
}));
router.get('/orders', wrap(async (req, res) => res.json(await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 100,
  include: { product: { select: { title: true } }, buyer: { select: { name: true } }, seller: { select: { name: true } } } }))));
module.exports = router;
