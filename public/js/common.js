const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = p => '₹' + (p / 100).toLocaleString('en-IN');
const label = s => String(s).replace(/_/g, ' ').toLowerCase().replace(/^\w|\s\w/g, c => c.toUpperCase());
async function api(url, opts = {}) {
  if (opts.body && !(opts.body instanceof FormData)) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(opts.body); }
  const r = await fetch('/api' + url, { credentials: 'same-origin', ...opts });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && opts.login !== false) { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); throw new Error('login'); }
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
let ME = null;
async function initNav() {
  ME = await api('/auth/me', { login: false }).catch(() => null);
  const l = (h, t) => `<a href="${h}">${t}</a>`;
  $('#nav').innerHTML = `<a class="brand" href="/">Campus<span>Mart</span></a><nav>${l('/marketplace','Marketplace')}${l('/how-it-works','How it works')}${l('/help','Help')}
    ${ME ? l('/sell','Sell')+l('/messages','Messages')+l('/cart','Cart')+l('/wishlist','Wishlist')+l('/my-orders','Orders')+l('/my-listings','My listings')+`<a href="/notifications">🔔<span class="badge" id="nb" hidden></span></a>`+l('/profile','Profile')+(ME.role==='ADMIN'?l('/admin/dashboard','Admin'):'') : ''}</nav>
    ${ME ? '<button class="btn alt sm" id="lo">Log out</button>' : l('/login','<span class="btn sm">Log in</span>') + l('/signup','<span class="btn alt sm">Sign up</span>')}`;
  $('#lo')?.addEventListener('click', async () => { await api('/auth/logout', { method: 'POST' }); location.href = '/'; });
  if (ME) refreshBadge();
  $('#foot').innerHTML = 'CampusMart — Your Campus. Your Marketplace. · ' + [['about','About'],['contact','Contact'],['faq','FAQ'],['privacy','Privacy'],['terms','Terms']].map(([h,t]) => l('/'+h,t)).join(' · ');
}
async function refreshBadge() {
  const n = (await api('/notifications').catch(() => [])).filter(x => !x.readAt).length;
  const b = $('#nb'); if (b) { b.hidden = !n; b.textContent = n; }
}
function card(p) {
  const img = p.images?.[0] ? `<img src="/uploads/${esc(p.images[0].path)}" alt="" loading="lazy">` : '<div class="noimg"></div>';
  return `<a class="card pcard" href="/product-details?id=${esc(p.id)}">${img}<div class="in"><b>${esc(p.title)}</b><div class="price">${money(p.pricePaise)}</div><span class="tag">${label(p.condition)}</span> <span class="tag">${esc(p.college)}</span>${p.status==='RESERVED'?' <span class="tag">Reserved</span>':''}</div></a>`;
}
const empty = (icon, text) => `<div class="empty"><div style="font-size:3rem">${icon}</div><p>${text}</p></div>`;
document.addEventListener('DOMContentLoaded', () => { window.ready = initNav(); });
