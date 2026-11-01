const CATS = ['ENGINEERING_TEXTBOOKS','ACADEMIC_BOOKS','REFERENCE_BOOKS','HANDWRITTEN_NOTES','PRINTED_NOTES','QUESTION_PAPERS','PRACTICAL_JOURNALS','LAB_MANUALS','STATIONERY','CALCULATORS','DRAWING_INSTRUMENTS','COLLEGE_ACCESSORIES','OTHER'];
$('[name=category]').innerHTML = CATS.map(c => `<option value="${c}">${label(c)}</option>`).join('');
$('[name=condition]').innerHTML = ['BRAND_NEW','LIKE_NEW','GOOD','USED','ACCEPTABLE'].map(c => `<option value="${c}">${label(c)}</option>`).join('');
window.ready.then(() => { if (!ME) location.href = '/login?next=/sell'; else $('[name=college]').value = ME.college || ''; });
$('#f').addEventListener('submit', async e => {
  e.preventDefault(); $('#err').textContent = '';
  try { const p = await api('/products', { method: 'POST', body: new FormData(e.target) }); location.href = '/product-details?id=' + p.id; }
  catch (x) { $('#err').textContent = x.message; }
});
