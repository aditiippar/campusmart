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
function buildShell() {
  const main = $('main'), foot = $('#foot');
  if (!main || $('.content')) return;
  const wrap = document.createElement('div'); wrap.className = 'content';
  const top = document.createElement('div'); top.className = 'topbar'; top.id = 'top';
  main.before(wrap); wrap.append(top, main, foot);
  const fa = document.createElement('link'); fa.rel = 'stylesheet'; fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'; document.head.append(fa);
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.onclick = () => document.body.classList.remove('sbopen'); document.body.append(ov);
  const ic = document.createElement('link'); ic.rel = 'icon'; ic.href = '/assets/logo/logo.svg'; document.head.append(ic);
}
async function initNav() {
  buildShell();
  ME = await api('/auth/me', { login: false }).catch(() => null);
  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const si = (h, i, t) => `<a class="si ${path === h || (h === '/' && path === '/home') ? 'on' : ''}" href="${h}"><i class="fa-solid ${i}"></i><span>${t}</span></a>`;
  $('#nav').innerHTML = `<a class="brand" href="/"><img src="/assets/logo/logo.svg" alt=""><span>Campus<b>Mart</b></span></a>
    <nav>${si('/', 'fa-house', 'Home')}${si('/marketplace', 'fa-bag-shopping', 'Browse')}${si('/sell', 'fa-circle-plus', 'Sell')}
    ${ME ? si('/messages', 'fa-comment-dots', 'Messages') + si('/cart', 'fa-cart-shopping', 'Cart') + si('/wishlist', 'fa-heart', 'Wishlist') + si('/my-orders', 'fa-receipt', 'My orders') + si('/my-listings', 'fa-boxes-stacked', 'My listings') + (ME.role === 'ADMIN' ? si('/admin/dashboard', 'fa-shield-halved', 'Admin') : '') : ''}
    ${si('/how-it-works', 'fa-lightbulb', 'How it works')}${si('/help', 'fa-circle-question', 'Help')}${si('/contact', 'fa-envelope', 'Contact')}</nav>
    <div class="sgap"></div>
    ${ME ? `<a class="si prof ${path === '/profile' ? 'on' : ''}" href="/profile"><span class="avatar"><i class="fa-solid fa-user-graduate"></i></span><span class="pname"><b>${esc(ME.name)}</b><small>View profile</small></span></a>`
         : '<div class="authbtns"><a class="btn" href="/login">Log in</a><a class="btn alt" href="/signup">Sign up</a></div>'}`;
  $('#top').innerHTML = `<button class="burger" id="bg" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
    <form action="/marketplace"><input name="q" placeholder="Search books, notes, calculators…"><button class="go"><i class="fa-solid fa-magnifying-glass"></i></button></form><div class="tsp"></div>
    ${ME ? `<a class="bell" href="/notifications" title="Notifications"><i class="fa-solid fa-bell"></i><span class="badge" id="nb" hidden></span></a><button class="btn alt sm" id="lo">Log out</button>` : '<a class="btn sm" href="/login">Log in</a>'}`;
  $('#bg').onclick = () => document.body.classList.toggle('sbopen');
  $('#lo')?.addEventListener('click', async () => { if (await confirmBox({ title: `Log out of ${ME.name}?`, text: 'You will need to sign in again to message sellers or manage your listings.', ok: 'Log out', danger: true })) { await api('/auth/logout', { method: 'POST' }); location.href = '/'; } });
  if (ME) refreshBadge();
  const a = (h, t) => `<a href="${h}">${t}</a>`;
  $('#foot').innerHTML = `<div class="fgrid"><div><div class="fbrand"><img src="/assets/logo/logo.svg" alt="">CampusMart</div><p>Your Campus. Your Marketplace.<br>A student-run marketplace where classmates buy, sell and exchange study materials.</p></div>
    <div><h4>Explore</h4>${a('/marketplace', 'Browse')}${a('/sell', 'Sell an item')}${a('/how-it-works', 'How it works')}</div>
    <div><h4>Company</h4>${a('/about', 'About CampusMart')}${a('/contact', 'Contact us')}${a('/help', 'Help &amp; support')}${a('/faq', 'FAQ')}</div>
    <div><h4>Legal</h4>${a('/privacy', 'Privacy policy')}${a('/terms', 'Terms &amp; conditions')}</div></div>
    <div class="fcopy">© ${new Date().getFullYear()} CampusMart. Made by students, for students.</div>`;
}
function confirmBox({ title, text, ok = 'Confirm', danger }) {
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'modal';
    d.innerHTML = `<div class="mbox"><h3>${esc(title)}</h3><p class="sub">${esc(text)}</p><div class="mact"><button class="btn alt" data-r="0">Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-r="1">${esc(ok)}</button></div></div>`;
    d.onclick = e => { const r = e.target.dataset.r; if (r !== undefined || e.target === d) { d.remove(); res(r === '1'); } };
    document.body.append(d);
  });
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
window.ready = initNav();
