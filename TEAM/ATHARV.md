# Atharv — DevOps + Testing + Reports + Product Integration

Owns: `server/services/report`, deployment config, demo data/seed scripts, docs, testing, final integration.

## 1. Infrastructure
- [ ] `.env.example` kept up to date as other members add new env vars (never let real `.env` get committed)
- [ ] Deployment target chosen (e.g. Render/Railway for server, Vercel/Netlify for client) — document
      the steps in `docs/deployment.md`
- [ ] Basic CI: lint + build on PR (GitHub Actions)
- [ ] CORS config finalized once client's deployed URL is known

## 2. Reports (`server/services/report/`)
- [ ] `server/models/Report.js` — `{ projectId, title, content, mediaIds, generatedBy, publicSlug, createdAt }`
- [ ] `POST /api/reports/generate` — assembles project overview, timeline, media gallery, activities,
      location, before/after, AI observations, evidence references, evidence gaps, methodology,
      traceability block
- [ ] PDF export of the generated report
- [ ] `GET /api/reports/:id` (authenticated) and `GET /api/reports/public/:slug` (no login)
- [ ] Campaign content generator: social caption, website story, executive summary, presentation summary
      (these can reuse the same AI summary service Chirag builds — confirm the interface with him)
- [ ] Every report must include the evidence traceability block: claim → source media →
      original Cloudinary asset → AI model/version → timestamp

## 3. Testing
- [ ] API integration tests for auth, projects, media, search, compare, reports
- [ ] Frontend smoke tests for the critical demo path (login → project → upload → search → compare → report)
- [ ] File upload validation tests (size limits, type checks)
- [ ] Security pass: no exposed API keys, rate limiting present, input validation on all mutating routes

## 4. Demo dataset (see `docs/demo-script.md`)
- [ ] Build the "Yamuna Urban Restoration Initiative" demo project: ~100 images, 5–10 videos,
      categories (Site Preparation, Cleaning, Plantation, Community, Infrastructure, After),
      locations (Delhi, Noida, Ghaziabad), Jan–Jun timeline, intentional before/after pairs
- [ ] Seed script (`server/utils/seedDemoData.js`) so the demo project can be recreated on any machine

## 5. Documentation
- [ ] Keep `README.md` accurate as features land
- [ ] `docs/deployment.md` — how to deploy client + server
- [ ] Final polished `docs/demo-script.md` walkthrough rehearsed end-to-end before presentation

## 6. Final integration (with Chirag + Chiranjeet)
- [ ] Confirm the full judge-facing flow works with zero developer intervention (see
      `docs/demo-script.md` §Success Criteria)
- [ ] Freeze feature branches ahead of demo day, only bugfixes after that point
