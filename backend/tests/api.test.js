// Run with: DATABASE_URL=... SESSION_SECRET=x APP_BASE_URL=http://localhost:3000 npm test
const test = require('node:test');
const assert = require('node:assert');
process.env.SESSION_SECRET ||= 'test'; process.env.APP_BASE_URL ||= 'http://localhost';
const { app } = require('../app');

let server, base;
test.before(() => new Promise(r => { server = app.listen(0, () => { base = 'http://localhost:' + server.address().port; r(); }); }));
test.after(() => server.close());

test('health check', async () => assert.equal(await (await fetch(base + '/health')).text(), 'ok'));
test('product list is public', async () => { const j = await (await fetch(base + '/api/products')).json(); assert.ok(Array.isArray(j.items)); });
test('cart requires login', async () => assert.equal((await fetch(base + '/api/cart')).status, 401));
test('admin API blocks anonymous users', async () => assert.equal((await fetch(base + '/api/admin/stats')).status, 403));
test('creating a listing requires login', async () => assert.equal((await fetch(base + '/api/products', { method: 'POST' })).status, 401));
