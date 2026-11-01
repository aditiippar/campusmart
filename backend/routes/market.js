const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const prisma = require('../prisma');
const { requireAuth, wrap, notify } = require('../middleware');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const PROD_DIR = path.join(UPLOAD_DIR, 'products');
fs.mkdirSync(PROD_DIR, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({ destination: PROD_DIR, filename: (r, f, cb) => cb(null, crypto.randomUUID() + EXT[f.mimetype]) }),
  limits: { fileSize: 4 * 1024 * 1024, files: 5 },
  fileFilter: (r, f, cb) => cb(EXT[f.mimetype] ? null : Object.assign(new Error('Only JPG, PNG or WebP images'), { status: 400 }), !!EXT[f.mimetype])
});

const CATS = ['ENGINEERING_TEXTBOOKS','ACADEMIC_BOOKS','REFERENCE_BOOKS','HANDWRITTEN_NOTES','PRINTED_NOTES','QUESTION_PAPERS','PRACTICAL_JOURNALS','LAB_MANUALS','STATIONERY','CALCULATORS','DRAWING_INSTRUMENTS','COLLEGE_ACCESSORIES','OTHER'];
const CONDS = ['BRAND_NEW','LIKE_NEW','GOOD','USED','ACCEPTABLE'];
const include = { images: { orderBy: { position: 'asc' } }, seller: { select: { id: true, name: true, college: true } } };

// Flag price as unusual vs. comparable listings (needs 5+ comparables; admin reviews manually)
async function checkPrice(p) {
  const comps = await prisma.product.findMany({ where: { category: p.category, condition: p.condition, id: { not: p.id }, status: { in: ['AVAILABLE', 'SOLD'] } }, select: { pricePaise: true } });
  if (comps.length < 5) return;
  const s = comps.map(c => c.pricePaise).sort((a, b) => a - b);
  const median = s[Math.floor(s.length / 2)];
  if (p.pricePaise > median * 2.5) await prisma.product.update({ where: { id: p.id }, data: { priceFlagged: true } });
}

router.get('/products', wrap(async (req, res) => {
  const { q, category, subcategory, min, max, condition, college, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1), take = 12;
  const where = { status: { in: ['AVAILABLE', 'RESERVED'] } };
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
  if (CATS.includes(category)) where.category = category;
  if (subcategory) where.subcategory = { contains: subcategory, mode: 'insensitive' };
  if (CONDS.includes(condition)) where.condition = condition;
  if (college) where.college = { contains: college, mode: 'insensitive' };
  const price = {};
  if (min !== undefined && min !== '' && !isNaN(min)) price.gte = Math.round(min * 100);
  if (max !== undefined && max !== '' && !isNaN(max)) price.lte = Math.round(max * 100);
  if (Object.keys(price).length) where.pricePaise = price;
  const orderBy = sort === 'price_asc' ? { pricePaise: 'asc' } : sort === 'price_desc' ? { pricePaise: 'desc' } : { createdAt: 'desc' };
  const [items, total] = await Promise.all([prisma.product.findMany({ where, orderBy, skip: (page - 1) * take, take, include }), prisma.product.count({ where })]);
  res.json({ items, total, page, pages: Math.ceil(total / take) });
}));

router.get('/products/:id', wrap(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: req.params.id }, include });
  const own = req.user && (req.user.id === p?.sellerId || req.user.role === 'ADMIN');
  if (!p || (['HIDDEN', 'REMOVED'].includes(p.status) && !own)) return res.status(404).json({ error: 'Not found' });
  const similar = await prisma.product.findMany({ where: { category: p.category, id: { not: p.id }, status: 'AVAILABLE' }, take: 4, include });
  res.json({ ...p, similar });
}));

router.post('/products', requireAuth, upload.array('images', 5), wrap(async (req, res) => {
  const { title, description, price, category, subcategory, condition, college } = req.body;
  const paise = Math.round(parseFloat(price) * 100);
  if (!title || !description || !college || !CATS.includes(category) || !CONDS.includes(condition) || !(paise > 0) || paise > 10000000) return res.status(400).json({ error: 'Please fill every field correctly' });
  if (!req.files?.length) return res.status(400).json({ error: 'Add at least one photo' });
  const p = await prisma.product.create({
    data: { sellerId: req.user.id, title: title.slice(0, 120), description: description.slice(0, 3000), pricePaise: paise, category, subcategory: subcategory?.slice(0, 80) || null, condition, college: college.slice(0, 120),
      images: { create: req.files.map((f, i) => ({ path: 'products/' + f.filename, position: i })) } }
  });
  await checkPrice(p);
  res.json(p);
}));

router.get('/my/products', requireAuth, wrap(async (req, res) =>
  res.json(await prisma.product.findMany({ where: { sellerId: req.user.id, status: { not: 'REMOVED' } }, orderBy: { createdAt: 'desc' }, include }))));

async function ownedProduct(req) {
  const p = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!p || (p.sellerId !== req.user.id && req.user.role !== 'ADMIN')) throw Object.assign(new Error('Not allowed'), { status: 403 });
  return p;
}
router.patch('/products/:id', requireAuth, wrap(async (req, res) => {
  const p = await ownedProduct(req); const d = {}; const b = req.body;
  if (b.title) d.title = b.title.slice(0, 120);
  if (b.description) d.description = b.description.slice(0, 3000);
  if (b.price && parseFloat(b.price) > 0) d.pricePaise = Math.round(parseFloat(b.price) * 100);
  if (['AVAILABLE', 'SOLD', 'UNAVAILABLE'].includes(b.status) && !['HIDDEN', 'REMOVED'].includes(p.status)) d.status = b.status;
  res.json(await prisma.product.update({ where: { id: p.id }, data: d }));
}));
router.delete('/products/:id', requireAuth, wrap(async (req, res) => {
  const p = await ownedProduct(req);
  await prisma.product.update({ where: { id: p.id }, data: { status: 'REMOVED' } });
  res.json({ ok: true });
}));

// Cart
router.get('/cart', requireAuth, wrap(async (req, res) => {
  const items = await prisma.cartItem.findMany({ where: { userId: req.user.id }, include: { product: { include } } });
  const live = items.filter(i => i.product.status === 'AVAILABLE');
  res.json({ items, subtotalPaise: live.reduce((s, i) => s + i.product.pricePaise, 0) });
}));
router.post('/cart/:productId', requireAuth, wrap(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!p || p.status !== 'AVAILABLE') return res.status(400).json({ error: 'Product is not available' });
  if (p.sellerId === req.user.id) return res.status(400).json({ error: "You can't buy your own product" });
  await prisma.cartItem.upsert({ where: { userId_productId: { userId: req.user.id, productId: p.id } }, create: { userId: req.user.id, productId: p.id }, update: {} });
  res.json({ ok: true });
}));
router.delete('/cart/:productId', requireAuth, wrap(async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
  res.json({ ok: true });
}));

// Wishlist
router.get('/wishlist', requireAuth, wrap(async (req, res) =>
  res.json((await prisma.wishlist.findMany({ where: { userId: req.user.id }, include: { product: { include } } })).map(w => w.product))));
router.post('/wishlist/:productId', requireAuth, wrap(async (req, res) => {
  const key = { userId_productId: { userId: req.user.id, productId: req.params.productId } };
  const ex = await prisma.wishlist.findUnique({ where: key });
  if (ex) await prisma.wishlist.delete({ where: key }); else await prisma.wishlist.create({ data: { userId: req.user.id, productId: req.params.productId } });
  res.json({ wishlisted: !ex });
}));

// Orders (purchase requests). Atomic reservation prevents two buyers getting the same product.
router.post('/orders', requireAuth, wrap(async (req, res) => {
  const ids = req.body.productIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > 20) return res.status(400).json({ error: 'No products' });
  const created = [], failed = [];
  for (const id of ids) {
    try {
      const o = await prisma.$transaction(async tx => {
        const p = await tx.product.findUnique({ where: { id } });
        if (!p || p.sellerId === req.user.id) throw new Error('invalid');
        const r = await tx.product.updateMany({ where: { id, status: 'AVAILABLE' }, data: { status: 'RESERVED' } });
        if (r.count !== 1) throw new Error('taken');
        await tx.cartItem.deleteMany({ where: { userId: req.user.id, productId: id } });
        return tx.order.create({ data: { productId: id, buyerId: req.user.id, sellerId: p.sellerId, pricePaise: p.pricePaise } });
      });
      await notify(prisma, o.sellerId, `New purchase request from ${req.user.name}`, '/my-orders');
      created.push(o);
    } catch { failed.push(id); }
  }
  res.json({ created, failed });
}));
router.get('/orders', requireAuth, wrap(async (req, res) =>
  res.json(await prisma.order.findMany({ where: { OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }] }, orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, title: true } }, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } } } }))));

// Allowed transitions: [who, from[] ]
const RULES = {
  ACCEPTED: ['seller', ['PENDING']], REJECTED: ['seller', ['PENDING']],
  MEETING_ARRANGED: ['seller', ['ACCEPTED']], COMPLETED: ['seller', ['ACCEPTED', 'MEETING_ARRANGED']],
  CANCELLED: ['either', ['PENDING', 'ACCEPTED', 'MEETING_ARRANGED']]
};
router.patch('/orders/:id', requireAuth, wrap(async (req, res) => {
  const rule = RULES[req.body.status];
  const o = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!rule || !o || ![o.buyerId, o.sellerId].includes(req.user.id)) return res.status(400).json({ error: 'Invalid request' });
  const isSeller = o.sellerId === req.user.id;
  if ((rule[0] === 'seller' && !isSeller) || !rule[1].includes(o.status)) return res.status(400).json({ error: 'Not allowed in current state' });
  const s = req.body.status;
  await prisma.$transaction([
    prisma.order.update({ where: { id: o.id }, data: { status: s } }),
    ...(['REJECTED', 'CANCELLED'].includes(s) ? [prisma.product.update({ where: { id: o.productId }, data: { status: 'AVAILABLE' } })] : []),
    ...(s === 'COMPLETED' ? [prisma.product.update({ where: { id: o.productId }, data: { status: 'SOLD' } })] : [])
  ]);
  await notify(prisma, isSeller ? o.buyerId : o.sellerId, `Order update: ${s.replace('_', ' ')}`, '/my-orders');
  res.json({ ok: true });
}));

// Reports
router.post('/reports', requireAuth, wrap(async (req, res) => {
  const { productId, reason, details } = req.body;
  const p = productId && await prisma.product.findUnique({ where: { id: productId } });
  if (!p || !reason) return res.status(400).json({ error: 'Product and reason required' });
  await prisma.report.create({ data: { reporterId: req.user.id, productId: p.id, sellerId: p.sellerId, reason: reason.slice(0, 80), details: details?.slice(0, 1000) } });
  res.json({ ok: true });
}));

// Notifications
router.get('/notifications', requireAuth, wrap(async (req, res) =>
  res.json(await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 }))));
router.post('/notifications/read', requireAuth, wrap(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
}));
module.exports = router;
