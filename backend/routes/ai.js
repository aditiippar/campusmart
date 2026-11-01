const router = require('express').Router();
const { requireAuth } = require('../middleware');

const DOCS = `CampusMart help documentation:
- Selling: log in, open Sell, upload 1-5 photos (JPG/PNG/WebP, max 4MB), fill title, description, category, price in INR, condition, college, then publish.
- Buying: browse the Marketplace (no login needed), use filters, open a product, press Chat with Seller to discuss meeting place/time, or Add to Cart / Buy Now to send a purchase request. No online payment happens on CampusMart; pay in person at handover.
- Orders: statuses are Pending, Accepted, Rejected, Meeting Arranged, Completed, Cancelled. Seller accepts/rejects; either side can cancel before completion. Manage on My Orders.
- Cancel a purchase: My Orders -> Cancel on a request that is not yet completed.
- Report a product or seller: open the product page and press Report Product; moderators review reports.
- Profile: open Profile to change name, college, department, year, phone.
- Listing not visible: it may be sold, marked unavailable, hidden or removed by a moderator (check My Listings and Notifications), or filtered out by your search filters.
- Safety: meet on campus in public places, inspect items before paying, never share passwords or OTPs.
- Human support: see the Contact page.`;

router.post('/ask', requireAuth, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'The AI assistant is not available right now. Please use the Help or Contact page.' });
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 1000) })) : [];
  const message = String(req.body.message || '').slice(0, 1000);
  if (!message) return res.status(400).json({ error: 'Empty message' });
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', max_tokens: 400, messages: [
        { role: 'system', content: `You are CampusMart's support assistant. Answer only from the documentation below. If unsure, say so and point to the Contact page. You cannot see any user's orders, messages or private data; never invent them or discuss other users.\n\n${DOCS}` },
        ...history, { role: 'user', content: message }] })
    });
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error(j.error?.message || 'OpenAI error'), { status: r.status });
    res.json({ reply: j.choices[0].message.content });
  } catch (e) { console.error('AI error', e.status, e.message);
    const why = e.status === 401 ? 'The assistant is not set up correctly (invalid API key).' : e.status === 429 ? 'The assistant is out of credit or too busy right now.' : e.status === 404 ? 'The configured AI model is not available.' : 'The assistant could not answer right now.';
    res.status(502).json({ error: why + ' Please try again later or use the Contact page.' }); }
});
module.exports = router;
