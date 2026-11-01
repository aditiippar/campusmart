const hist = [];
$('#af').addEventListener('submit', async e => {
  e.preventDefault(); const i = $('#ai'), q = i.value.trim(); if (!q) return; i.value = '';
  const log = $('#al'); log.insertAdjacentHTML('beforeend', `<div class="m me">${esc(q)}</div>`);
  try { const r = await api('/ai/ask', { method: 'POST', body: { message: q, history: hist } }); hist.push({ role: 'user', content: q }, { role: 'assistant', content: r.reply }); log.insertAdjacentHTML('beforeend', `<div class="m">${esc(r.reply)}</div>`); }
  catch (x) { if (x.message !== 'login') log.insertAdjacentHTML('beforeend', `<div class="m">${esc(x.message)}</div>`); }
  log.scrollTop = 1e9;
});
