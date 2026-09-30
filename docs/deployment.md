# Deployment

Recommended free-tier setup: **MongoDB Atlas** (database) → **Render** (API, `render.yaml`) → **Vercel** (client, `client/vercel.json`). Vercel proxies `/api/*` to Render, so the browser only ever talks to one site and the httpOnly session cookie works with `COOKIE_SAMESITE=lax`.

## 1. Database (MongoDB Atlas)

1. Create a free cluster and a database user.
2. Network access: allow Render's outbound IPs (or `0.0.0.0/0` for a hackathon demo).
3. Copy the `mongodb+srv://…` connection string; it becomes `MONGODB_URI`.

## 2. API (Render)

1. Render dashboard → **New → Blueprint** → select this repository. `render.yaml` creates the `impactlens-api` web service (root `server/`, `npm start`, health check `/api/health`).
2. Fill in the secret variables it asks for:
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. The cloud name is the **Cloud name** on the Cloudinary dashboard, all lowercase, not the account's display name.
   - `CLIENT_URL`: `https://impact-lens-ai-one.vercel.app` (allowed browser origin).
   - `PUBLIC_REPORT_BASE_URL`: `https://impact-lens-ai-one.vercel.app/reports` (public share-link base).

   `JWT_SECRET` is generated automatically.
3. After the first deploy, open `https://<service>.onrender.com/api/health`. You want `"database":"connected"`, `"cloudinary":"configured"` and `"aiProvider":"gemini"`.
4. Load the real demo dataset once, from the Render **Shell** tab: `npm run seed:real`. It creates the demo accounts, imports the openly licensed photos, runs AI analysis and generates insights.

> Use Cloudinary in production. Without it, uploads go to the service's local disk, which Render's free tier wipes on every deploy or restart, and videos can't be frame-analyzed. Settings → Service status and `/api/health` show `"cloudinary":"misconfigured"` when the credentials are rejected.

## 3. Client (Vercel)

1. Vercel → **Add New Project** → import this repository and set **Root Directory** to `client`. The framework preset (Vite), build command and output folder come from `client/vercel.json`.
2. The `/api/:path*` rewrite in `client/vercel.json` points at `https://impactlens-ai-1.onrender.com`.
3. Leave `VITE_API_BASE_URL` unset (same-origin `/api`).
4. Deploy, then sign in with `manager@impactlens.demo / Manager123!` and change the demo passwords before sharing widely.

## Behaviour notes

- **Cookies and CSRF:** sessions use an httpOnly `token` cookie. Cookie-authenticated writes must send `X-Requested-With: XMLHttpRequest`, which the client does automatically. To host the API on a different site instead of proxying, set `COOKIE_SAMESITE=none` (HTTPS only), `CLIENT_URL`, and `VITE_API_BASE_URL` at build time.
- **Proxies:** `TRUST_PROXY=2` (set in `render.yaml`) makes rate limits and secure cookies use the real client IP behind Vercel → Render.
- **Rate limits:** login/register allow 20 failed attempts per window. Uploads, analysis and generation share `RATE_LIMIT_ACTION_MAX` (default 120).
- **Docker:** build from the repo root, since the server needs `shared/`: `docker build -f server/Dockerfile -t impactlens-api .` For local use there's also `cd server && docker compose up --build`.
- **Offline demo:** `AI_PROVIDER=mock` and `CLOUDINARY_MODE=mock` run with no external services; `npm run seed` loads the synthetic test fixture.

Before production, review backups and retention, public-report privacy (published reports expose thumbnails and AI observations), and load performance.
