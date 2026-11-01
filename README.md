# CampusMart — Your Campus. Your Marketplace.

Student marketplace: Express + PostgreSQL (Prisma) + Socket.IO + Passport (email & Google) + optional OpenAI support assistant. One Render web service serves everything.

## What is included / not included
Included: auth (email+Google), marketplace with DB filters + pagination, selling with image upload, cart, wishlist, purchase requests with race-safe reservation, order statuses, real-time chat (stored in PostgreSQL, authorized sockets, unread counts, read receipts, meeting suggestions), notifications, reports, admin panel (stats, users, products, reports, orders, audit log, unusual-price flags), AI help assistant, Render config.

**Not built yet** (be aware): email verification and password reset (needs an email service such as SMTP/Resend — tell me which and I'll add it), chat image sharing, separate `order_items`/`categories` tables (categories are a database enum; one product per order), admin audit-log viewer page (entries are recorded in `AuditLog`), logo/brand images, final privacy/terms text. Your live site's exact colours could not be read (it's a JS app), so the pink/lavender palette in `public/css/style.css` follows your brief — adjust the `:root` variables to match.

**Not tested here:** this was written without internet access, so `npm install`, database migrations, Google OAuth, OpenAI and live Socket.IO were NOT run. JavaScript syntax was checked only. Expect to fix small issues on first run.

## 1. Run locally
1. Install Node 18+ and PostgreSQL. Create a database `campusmart`.
2. `cp .env.example .env` and fill it in (for local: `DATABASE_URL=postgresql://user:pass@localhost:5432/campusmart`, `APP_BASE_URL=http://localhost:3000`, `NODE_ENV=development`, `UPLOAD_DIR=./uploads`). Load it with `export $(grep -v '^#' .env | xargs)`.
3. `npm install`
4. **Create the first migration once:** `npx prisma migrate dev --name init` — this creates `prisma/migrations/`. Commit that folder.
5. `npm run dev` → http://localhost:3000. `npm test` runs the route tests.

## 2. Deploy on Render
1. Create an account at render.com and push this project to GitHub (including `prisma/migrations`).
2. **Plans:** persistent disks need a paid web service (Starter or higher). Without a disk, uploaded photos disappear on every deploy.
3. New → Blueprint → pick the repo (uses `render.yaml`), or create manually: PostgreSQL database + Web Service (Node). Build: `npm install && npx prisma generate`. Start: `npm start` (runs `prisma migrate deploy`, then the server). Health check: `/health`.
4. `DATABASE_URL`: use the database's **Internal Database URL** (same region).
5. Disk: name `uploads`, mount path `/var/data`; set `UPLOAD_DIR=/var/data/uploads`.
6. Set `APP_BASE_URL` to your Render URL (no trailing slash) and `SESSION_SECRET` to a long random string.
7. Admin: set `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`. The admin is created once on first start; then delete the password variable. Log in at `/admin/admin-login`.
8. **Google OAuth:** Google Cloud Console → APIs & Services → OAuth consent screen, then Credentials → Create OAuth client ID (Web). Authorized redirect URI: `https://YOUR-APP.onrender.com/api/auth/google/callback`. Put the ID/secret and that same URL in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.
9. **OpenAI (optional):** create a key at platform.openai.com and set `OPENAI_API_KEY`. Without it the assistant says it is unavailable.
10. Test the live site: sign up, list a product with photos, open it in a second account, chat, send a purchase request, accept it as seller, check admin pages.

## Security notes
bcrypt hashing, HTTP-only secure cookies, Postgres session store, helmet, rate limiting, same-origin check on write requests, validated and size-limited image uploads (JPG/PNG/WebP, 4 MB), server-side role checks, prices/status/seller always taken from the database or session — never from the client.
