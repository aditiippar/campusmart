let socket, cur = null, convs = [], place = null, coords = null;
const params = new URLSearchParams(location.search);
const BUYER = ['Hi! Is this still available?', 'Where can we meet?', 'What time works for you?', 'Can you reduce the price a little?', 'Can you send more photos?', "I'll take it! 🎉"];
const SELLER = ["Yes, it's still available.", 'Where would you like to meet on campus?', 'What time suits you?', 'Sorry, this one is already sold.', 'The price is fixed, sorry.', 'Great, see you there! 👍'];
const PLACES = [['Main gate', 'fa-door-open'], ['Library', 'fa-book-open'], ['Canteen', 'fa-utensils'], ['Parking area', 'fa-square-parking'], ['Department building', 'fa-building-columns'], ['Playground', 'fa-futbol']];
const fmt = t => esc(t).replace(/(https:\/\/www\.google\.com\/maps[^\s<]*)/g, '<a href="$1" target="_blank" rel="noopener">🗺 Open in Google Maps</a>');
const send = body => socket.emit('send', { convId: cur, body });

window.ready.then(async () => {
  if (!ME) return location.href = '/login?next=/messages';
  socket = io();
  socket.on('message', m => { if (m.conversationId === cur) { add(m); api('/conversations/' + cur + '/messages').catch(() => {}); } else list(); });
  await list(); if (params.get('c')) open(params.get('c'));
});
async function list() {
  convs = await api('/conversations');
  $('#cl').innerHTML = convs.length ? convs.map(c => `<div data-c="${c.id}" class="${c.id === cur ? 'on' : ''}"><b>${esc(c.product.title)}</b><br><small>${esc(c.buyerId === ME.id ? c.seller.name : c.buyer.name)}</small>${c._count.messages ? `<span class="badge">${c._count.messages}</span>` : ''}</div>`).join('') : '<p>No conversations yet.</p>';
}
$('#cl').addEventListener('click', e => { const d = e.target.closest('[data-c]'); if (d) open(d.dataset.c); });
function add(m) {
  const d = document.createElement('div'); d.className = 'm' + (m.senderId === ME.id ? ' me' : '');
  d.innerHTML = `<small>${esc(m.sender.name)} · ${new Date(m.createdAt).toLocaleString()}${m.senderId === ME.id && m.readAt ? ' · ✓ Read' : ''}</small>${fmt(m.body)}`;
  $('#ms').append(d); $('#ms').scrollTop = 1e9;
}
async function open(id) {
  cur = id; $('#ms').innerHTML = ''; $('#cf').hidden = false; $('#qr').hidden = false; $('#ch').hidden = false;
  const c = convs.find(x => x.id === id);
  if (c) {
    const buyer = c.buyerId === ME.id;
    $('#ch').innerHTML = `<a href="/product-details?id=${esc(c.product.id)}">${esc(c.product.title)}</a><small>Chatting with ${esc(buyer ? c.seller.name : c.buyer.name)} · you are the ${buyer ? 'buyer' : 'seller'}</small>`;
    $('#qr').innerHTML = (buyer ? BUYER : SELLER).map(t => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('');
  }
  socket.emit('join', id, async r => { if (r?.error) return; (await api('/conversations/' + id + '/messages')).forEach(add); list(); });
}
$('#qr').addEventListener('click', e => { const t = e.target.dataset.t; if (t && cur) send(t); });
$('#cf').addEventListener('submit', e => { e.preventDefault(); const i = $('#ci'); if (!i.value.trim()) return; send(i.value); i.value = ''; });

// Meetup modal
$('#places').innerHTML = PLACES.map(([p, i]) => `<button type="button" class="chip" data-p="${p}"><i class="fa-solid ${i}"></i> ${p}</button>`).join('');
const resetMeet = () => { place = null; coords = null; $('#cplace').value = ''; $('#when').value = ''; $('#locst').textContent = ''; $('#merr').textContent = ''; [...$('#places').children].forEach(x => x.classList.remove('on')); };
$('#meet').addEventListener('click', () => { resetMeet(); $('#mm').hidden = false; });
$('#mcancel').addEventListener('click', () => $('#mm').hidden = true);
$('#places').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; place = b.dataset.p; $('#cplace').value = ''; [...$('#places').children].forEach(x => x.classList.toggle('on', x === b)); });
$('#cplace').addEventListener('input', () => { place = null; [...$('#places').children].forEach(x => x.classList.remove('on')); });
$('#loc').addEventListener('click', () => {
  if (!navigator.geolocation) return $('#locst').textContent = 'Location is not supported on this device.';
  $('#locst').textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition(p => { coords = p.coords; $('#locst').textContent = '✓ Location attached'; }, () => $('#locst').textContent = 'Could not get location. Choose a place instead.', { enableHighAccuracy: true, timeout: 10000 });
});
$('#msend').addEventListener('click', () => {
  const p = place || $('#cplace').value.trim();
  if (!p && !coords) return $('#merr').textContent = 'Pick a place or share your location.';
  const w = $('#when').value, lines = ['📍 Meetup suggestion'];
  if (p) lines.push('Place: ' + p);
  lines.push('Time: ' + (w ? new Date(w).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'To be decided'));
  lines.push(coords ? 'Pin: https://www.google.com/maps?q=' + coords.latitude.toFixed(6) + ',' + coords.longitude.toFixed(6)
                    : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p + ' ' + (ME.college || '')));
  send(lines.join('\n')); $('#mm').hidden = true;
});
