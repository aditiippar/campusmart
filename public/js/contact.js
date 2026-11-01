fetch('/api/config').then(r => r.json()).then(c => {
  if (!c.supportEmail) { $('#em').innerHTML = 'Use the <a href="/help">Help assistant</a> for now. A support email will be added soon.'; return; }
  $('#em').innerHTML = `<a href="mailto:${esc(c.supportEmail)}">${esc(c.supportEmail)}</a><br>We usually reply within 1–2 days.`;
  $('#cf').hidden = false;
  $('#cf').addEventListener('submit', e => { e.preventDefault(); location.href = `mailto:${c.supportEmail}?subject=${encodeURIComponent($('#sj').value)}&body=${encodeURIComponent($('#mg').value)}`; });
});
