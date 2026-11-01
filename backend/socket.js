const { Server } = require('socket.io');
const passport = require('passport');
const prisma = require('./prisma');

module.exports = (httpServer, sessionMiddleware) => {
  const io = new Server(httpServer, { cors: { origin: process.env.APP_BASE_URL, credentials: true } });
  const wrapMw = mw => (socket, next) => mw(socket.request, {}, next);
  io.use(wrapMw(sessionMiddleware));
  io.use(wrapMw(passport.initialize()));
  io.use(wrapMw(passport.session()));
  io.use((socket, next) => socket.request.user ? next() : next(new Error('unauthorized')));

  io.on('connection', socket => {
    const me = socket.request.user;
    socket.join('user:' + me.id);
    socket.on('join', async (convId, ack) => {
      const c = await prisma.conversation.findUnique({ where: { id: String(convId) } });
      if (!c || ![c.buyerId, c.sellerId].includes(me.id)) return ack?.({ error: 'forbidden' });
      socket.join('conv:' + c.id); ack?.({ ok: true });
    });
    socket.on('send', async ({ convId, body }, ack) => {
      body = String(body || '').trim().slice(0, 2000);
      const c = await prisma.conversation.findUnique({ where: { id: String(convId) } });
      if (!body || !c || ![c.buyerId, c.sellerId].includes(me.id)) return ack?.({ error: 'forbidden' });
      const m = await prisma.message.create({ data: { conversationId: c.id, senderId: me.id, body }, include: { sender: { select: { name: true } } } });
      await prisma.conversation.update({ where: { id: c.id }, data: { updatedAt: new Date() } });
      const other = c.buyerId === me.id ? c.sellerId : c.buyerId;
      await prisma.notification.create({ data: { userId: other, text: `New message from ${me.name}`, link: '/messages?c=' + c.id } });
      io.to('conv:' + c.id).emit('message', m);
      io.to('user:' + other).emit('notify');
      ack?.({ ok: true });
    });
  });
  return io;
};
