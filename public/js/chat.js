let socket, cur = null;
const params = new URLSearchParams(location.search);
window.ready.then(async () => {
  if (!ME) return location.href = '/login?next=/messages';
  socket = io();
  socket.on('message', m => { if (m.conversationId === cur) { add(m); api('/conversations/' + cur + '/messages').catch(() => {}); } else list(); });
  await list(); if (params.get('c')) open(params.get('c'));
});
async function list() {
  const cs = await api('/conversations');
  $('#cl').innerHTML = cs.length ? cs.map(c => `<div data-c="${c.id}" class="${c.id === cur ? 'on' : ''}"><b>${esc(c.product.title)}</b><br><small>${esc(c.buyerId === ME.id ? c.seller.name : c.buyer.name)}</small>${c._count.messages ? `<span class="badge">${c._count.messages}</span>` : ''}</div>`).join('') : '<p>No conversations yet. Open a product and press “Chat with Seller”.</p>';
}
$('#cl').addEventListener('click', e => { const d = e.target.closest('[data-c]'); if (d) open(d.dataset.c); });
function add(m) { const d = document.createElement('div'); d.className = 'm' + (m.senderId === ME.id ? ' me' : ''); d.innerHTML = `<small>${esc(m.sender.name)} · ${new Date(m.createdAt).toLocaleString()}${m.senderId === ME.id && m.readAt ? ' · ✓ Read' : ''}</small>${esc(m.body)}`; $('#ms').append(d); $('#ms').scrollTop = 1e9; }
async function open(id) {
  cur = id; $('#ms').innerHTML = ''; $('#cf').hidden = false;
  socket.emit('join', id, async r => { if (r?.error) return; (await api('/conversations/' + id + '/messages')).forEach(add); list(); });
}
$('#cf').addEventListener('submit', e => { e.preventDefault(); const i = $('#ci'); if (!i.value.trim()) return; socket.emit('send', { convId: cur, body: i.value }); i.value = ''; });
$('#meet').addEventListener('click', () => { const w = prompt('Suggested meeting place and time (e.g. “Library gate, 4 pm Friday”)'); if (w) socket.emit('send', { convId: cur, body: '📍 Suggested meeting: ' + w }); });
