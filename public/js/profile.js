window.ready.then(() => { if (!ME) return location.href = '/login?next=/profile'; for (const k of ['name','college','department','year','phone']) $('[name=' + k + ']').value = ME[k] ?? ''; });
$('#f').addEventListener('submit', async e => {
  e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); b.year = b.year ? parseInt(b.year) : undefined;
  try { await api('/auth/me', { method: 'PATCH', body: b }); $('#err').style.color = '#2a8a4a'; $('#err').textContent = 'Saved'; } catch (x) { $('#err').textContent = x.message; }
});
