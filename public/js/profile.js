function head() { $('#pn').textContent = ME.name; $('#pe').textContent = ME.email; const c = [ME.college, ME.department].filter(Boolean).join(' · '); $('#pc').hidden = !c; $('#pc').textContent = c; if (ME.role === 'ADMIN') $('.bigav').innerHTML = '<img src="/assets/images/creator.jpg" alt="">';
  const n = $('.pname b'); if (n) n.textContent = ME.name; }
window.ready.then(() => { if (!ME) return location.href = '/login?next=/profile'; head(); for (const k of ['name', 'college', 'department', 'year', 'phone']) $('[name=' + k + ']').value = ME[k] ?? ''; });
$('#f').addEventListener('submit', async e => {
  e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); b.year = b.year ? parseInt(b.year) : undefined;
  try { ME = { ...ME, ...(await api('/auth/me', { method: 'PATCH', body: b })) }; head(); $('#err').style.color = '#2a8a4a'; $('#err').textContent = '✓ Profile saved'; }
  catch (x) { $('#err').style.color = ''; $('#err').textContent = x.message; }
});
