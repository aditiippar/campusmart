const router = require('express').Router();
const prisma = require('../prisma');
const { requireAuth, wrap } = require('../middleware');

router.post('/conversations', requireAuth, wrap(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: req.body.productId } });
  if (!p) return res.status(404).json({ error: 'Product not found' });
  if (p.sellerId === req.user.id) return res.status(400).json({ error: "That's your own listing" });
  const c = await prisma.conversation.upsert({ where: { productId_buyerId: { productId: p.id, buyerId: req.user.id } }, create: { productId: p.id, buyerId: req.user.id, sellerId: p.sellerId }, update: {} });
  res.json(c);
}));
router.get('/conversations', requireAuth, wrap(async (req, res) => {
  const me = req.user.id;
  const list = await prisma.conversation.findMany({ where: { OR: [{ buyerId: me }, { sellerId: me }] }, orderBy: { updatedAt: 'desc' },
    include: { product: { select: { id: true, title: true } }, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } },
      _count: { select: { messages: { where: { senderId: { not: me }, readAt: null } } } } } });
  res.json(list);
}));
router.get('/conversations/:id/messages', requireAuth, wrap(async (req, res) => {
  const c = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!c || ![c.buyerId, c.sellerId].includes(req.user.id)) return res.status(403).json({ error: 'Not allowed' });
  await prisma.message.updateMany({ where: { conversationId: c.id, senderId: { not: req.user.id }, readAt: null }, data: { readAt: new Date() } });
  res.json(await prisma.message.findMany({ where: { conversationId: c.id }, orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true } } } }));
}));
module.exports = router;
