const id = new URLSearchParams(location.search).get('id');
(async () => {
  await window.ready;
  try {
    const p = await api('/products/' + encodeURIComponent(id), { login: false });
    const mine = ME && ME.id === p.sellerId, can = p.status === 'AVAILABLE' && !mine;
    $('#p').innerHTML = `<div class="gal">${p.images.map(i => `<img src="/uploads/${esc(i.path)}" alt="">`).join('')}</div>
      <h1>${esc(p.title)}</h1><div class="price">${money(p.pricePaise)}</div>
      <p><span class="tag">${label(p.condition)}</span> <span class="tag">${label(p.category)}</span> <span class="tag">${label(p.status)}</span></p>
      <p style="white-space:pre-wrap">${esc(p.description)}</p>
      <p>Seller: <b>${esc(p.seller.name)}</b> · ${esc(p.college)} · Listed ${new Date(p.createdAt).toLocaleDateString()}</p>
      <p id="msg" class="err"></p>
      ${mine ? '<p>This is your listing. <a href="/my-listings">Manage it</a>.</p>' : `<button class="btn" id="cart" ${can?'':'disabled'}>Add to Cart</button> <button class="btn" id="buy" ${can?'':'disabled'}>Buy Now</button>
        <button class="btn alt" id="chat">Chat with Seller</button> <button class="btn alt" id="wish">♡ Wishlist</button> <button class="btn alt" id="rep">Report</button>`}
      <h3>Similar products</h3><div class="grid">${p.similar.map(card).join('') || '<p>None yet.</p>'}</div>`;
    const say = (t, ok) => { $('#msg').style.color = ok ? '#2a8a4a' : ''; $('#msg').textContent = t; };
    const run = f => async () => { try { await f(); } catch (e) { if (e.message !== 'login') say(e.message); } };
    $('#cart')?.addEventListener('click', run(async () => { await api('/cart/' + p.id, { method: 'POST' }); say('Added to cart', 1); }));
    $('#buy')?.addEventListener('click', run(async () => { const r = await api('/orders', { method: 'POST', body: { productIds: [p.id] } }); if (r.failed.length) say('Sorry, someone just reserved this.'); else location.href = '/my-orders'; }));
    $('#chat')?.addEventListener('click', run(async () => { const c = await api('/conversations', { method: 'POST', body: { productId: p.id } }); location.href = '/messages?c=' + c.id; }));
    $('#wish')?.addEventListener('click', run(async () => { const r = await api('/wishlist/' + p.id, { method: 'POST' }); say(r.wishlisted ? 'Added to wishlist' : 'Removed from wishlist', 1); }));
    $('#rep')?.addEventListener('click', run(async () => { const reason = prompt('Reason: price too high, misleading, fake, fraud, spam, other'); if (!reason) return; await api('/reports', { method: 'POST', body: { productId: p.id, reason, details: prompt('Details (optional)') || '' } }); say('Report sent. Thank you.', 1); }));
  } catch (e) { $('#p').innerHTML = empty('🔍', 'Listing not found.'); }
})();
