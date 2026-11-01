// Shared logic for cart, wishlist, my-listings, my-orders, notifications
const page = document.body.dataset.page;
const out = $('#out');
const views = {
  async cart() {
    const d = await api('/cart');
    out.innerHTML = d.items.length ? d.items.map(i => `<div class="card" style="margin:8px 0"><b>${esc(i.product.title)}</b> — ${money(i.product.pricePaise)} ${i.product.status !== 'AVAILABLE' ? '<span class="tag">No longer available</span>' : ''} <button class="btn sm danger" data-rm="${i.productId}">Remove</button></div>`).join('')
      + `<h3>Subtotal: ${money(d.subtotalPaise)}</h3><p>No online payment: this sends purchase requests. You pay the seller in person when you meet.</p><button class="btn" id="go">Send purchase requests</button>` : empty('🛒', 'Your cart is empty.');
    out.onclick = async e => {
      if (e.target.dataset.rm) { await api('/cart/' + e.target.dataset.rm, { method: 'DELETE' }); views.cart(); }
      if (e.target.id === 'go') { const r = await api('/orders', { method: 'POST', body: { productIds: d.items.filter(i => i.product.status === 'AVAILABLE').map(i => i.productId) } }); alert(`${r.created.length} request(s) sent, ${r.failed.length} unavailable.`); location.href = '/my-orders'; }
    };
  },
  async wishlist() { const d = await api('/wishlist'); out.innerHTML = d.length ? `<div class="grid">${d.map(card).join('')}</div>` : empty('♡', 'Nothing saved yet.'); },
  async listings() {
    const d = await api('/my/products');
    out.innerHTML = d.length ? d.map(p => `<div class="card" style="margin:8px 0"><a href="/product-details?id=${p.id}"><b>${esc(p.title)}</b></a> ${money(p.pricePaise)} <span class="tag">${label(p.status)}</span><br>
      ${['AVAILABLE','SOLD','UNAVAILABLE'].map(s => `<button class="btn sm alt" data-id="${p.id}" data-s="${s}">Mark ${label(s)}</button>`).join(' ')} <button class="btn sm alt" data-id="${p.id}" data-price="1">Edit price</button> <button class="btn sm danger" data-id="${p.id}" data-del="1">Delete</button></div>`).join('') : empty('📦', 'You have no listings. <a href="/sell">Sell something</a>.');
    out.onclick = async e => { const t = e.target, id = t.dataset.id; if (!id) return;
      if (t.dataset.del) { if (!confirm('Delete this listing?')) return; await api('/products/' + id, { method: 'DELETE' }); }
      else if (t.dataset.price) { const v = prompt('New price in ₹'); if (!v) return; await api('/products/' + id, { method: 'PATCH', body: { price: v } }); }
      else await api('/products/' + id, { method: 'PATCH', body: { status: t.dataset.s } });
      views.listings(); };
  },
  async orders() {
    const d = await api('/orders');
    await window.ready;
    out.innerHTML = d.length ? d.map(o => { const sell = o.sellerId === ME.id;
      return `<div class="card" style="margin:8px 0"><b>${esc(o.product.title)}</b> ${money(o.pricePaise)} <span class="tag">${label(o.status)}</span><br>${sell ? 'Buyer: ' + esc(o.buyer.name) : 'Seller: ' + esc(o.seller.name)}<br>
      ${(sell ? { PENDING: ['ACCEPTED', 'REJECTED'], ACCEPTED: ['MEETING_ARRANGED', 'COMPLETED'], MEETING_ARRANGED: ['COMPLETED'] }[o.status] || [] : []).map(s => `<button class="btn sm" data-id="${o.id}" data-s="${s}">${label(s)}</button>`).join(' ')}
      ${['PENDING', 'ACCEPTED', 'MEETING_ARRANGED'].includes(o.status) ? `<button class="btn sm danger" data-id="${o.id}" data-s="CANCELLED">Cancel</button>` : ''}</div>`; }).join('') : empty('🧾', 'No orders yet.');
    out.onclick = async e => { if (!e.target.dataset.s) return; try { await api('/orders/' + e.target.dataset.id, { method: 'PATCH', body: { status: e.target.dataset.s } }); } catch (x) { alert(x.message); } views.orders(); };
  },
  async notifications() {
    const d = await api('/notifications');
    out.innerHTML = d.length ? d.map(n => `<div class="card" style="margin:8px 0">${n.readAt ? '' : '● '}<a href="${esc(n.link || '#')}">${esc(n.text)}</a> <small>${new Date(n.createdAt).toLocaleString()}</small></div>`).join('') : empty('🔔', 'No notifications.');
    api('/notifications/read', { method: 'POST' }).then(refreshBadge);
  }
};
window.ready.then(() => views[page]());
