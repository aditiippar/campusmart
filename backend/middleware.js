exports.requireAuth = (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: 'Login required' });
exports.requireAdmin = (req, res, next) => (req.isAuthenticated() && req.user.role === 'ADMIN') ? next() : res.status(403).json({ error: 'Admins only' });
exports.wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
exports.notify = (prisma, userId, text, link) => prisma.notification.create({ data: { userId, text, link } });
exports.publicUser = u => u && { id: u.id, name: u.name, email: u.email, role: u.role, college: u.college, department: u.department, year: u.year, phone: u.phone };
