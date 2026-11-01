const CATS = ['ENGINEERING_TEXTBOOKS','ACADEMIC_BOOKS','REFERENCE_BOOKS','HANDWRITTEN_NOTES','PRINTED_NOTES','QUESTION_PAPERS','PRACTICAL_JOURNALS','LAB_MANUALS','STATIONERY','CALCULATORS','DRAWING_INSTRUMENTS','COLLEGE_ACCESSORIES','OTHER'];
const CONDS = ['BRAND_NEW','LIKE_NEW','GOOD','USED','ACCEPTABLE'];
$('#category').innerHTML = '<option value="">All categories</option>' + CATS.map(c => `<option value="${c}">${label(c)}</option>`).join('');
$('#condition').innerHTML = '<option value="">Any condition</option>' + CONDS.map(c => `<option value="${c}">${label(c)}</option>`).join('');
let page = 1;
async function load() {
  const p = new URLSearchParams(new FormData($('#flt'))); [...p.keys()].forEach(k => !p.get(k) && p.delete(k)); p.set('page', page);
  const d = await api('/products?' + p, { login: false });
  $('#list').innerHTML = d.items.length ? d.items.map(card).join('') : empty('📚', 'No listings match yet. Be the first to <a href="/sell">sell something</a>!');
  $('#pager').innerHTML = d.pages > 1 ? Array.from({ length: d.pages }, (_, i) => `<button class="btn sm ${i + 1 === d.page ? '' : 'alt'}" data-p="${i + 1}">${i + 1}</button>`).join('') : '';
}
$('#flt').addEventListener('input', () => { page = 1; clearTimeout(window.t); window.t = setTimeout(load, 300); });
$('#flt').addEventListener('submit', e => e.preventDefault());
$('#pager').addEventListener('click', e => { if (e.target.dataset.p) { page = +e.target.dataset.p; load(); scrollTo(0, 0); } });
load();
