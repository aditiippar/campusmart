const next = new URLSearchParams(location.search).get('next') || (location.pathname.startsWith('/admin') ? '/admin/dashboard' : '/marketplace');
fetch('/api/config').then(r => r.json()).then(c => { if (!c.googleEnabled) $('#google')?.remove(); });
$('#google')?.setAttribute('href', '/api/auth/google?next=' + encodeURIComponent(next));
$('#f').addEventListener('submit', async e => {
  e.preventDefault(); $('#err').textContent = '';
  const body = Object.fromEntries(new FormData(e.target));
  try { await api(e.target.dataset.url, { method: 'POST', body, login: false }); location.href = next.startsWith('/') && !next.startsWith('//') ? next : '/marketplace'; }
  catch (x) { $('#err').textContent = e.target.dataset.url.includes('login') ? 'Wrong email or password' : x.message; }
});
