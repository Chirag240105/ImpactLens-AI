# Chirag — Backend + AI Architecture + Integration Lead

Owns: `server/controllers`, `server/routes`, `server/models`, `server/middleware`,
`server/services/cloudinary`, `server/services/ai`, `server/services/search`, MongoDB schemas.

## 1. Backend foundation
- [ ] `server/app.js` — Express app, middleware (cors, json, error handler)
- [ ] `server/middleware/auth.js` — JWT verification + role-based guard
- [ ] `server/models/User.js` — `{ name, email, passwordHash, role, createdAt }`
- [ ] `server/routes/auth.routes.js` + `server/controllers/auth.controller.js`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- [ ] Password hashing (bcrypt), input validation on all auth routes

## 2. Project management
- [ ] `server/models/Project.js` — fields per `docs/api.md` §Projects
- [ ] `server/routes/project.routes.js` + `server/controllers/project.controller.js`
  - `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`

## 3. Cloudinary integration (`server/services/cloudinary/`)
- [ ] `uploadService.js` — upload image/video, return `{ publicId, secureUrl, resourceType }`
- [ ] Folder convention: `impactlens/projects/<project-id>/{before,after,field-evidence,reports}`
- [ ] Transformation presets: thumbnail, responsive, comparison-pair, report-asset, video-preview
- [ ] Keep credentials server-side only (env vars, never in client)

## 4. Media API
- [ ] `server/models/MediaAsset.js` — full schema from `docs/architecture.md` §mediaAssets
- [ ] `server/routes/media.routes.js` + `server/controllers/media.controller.js`
  - `POST /api/media/upload` → creates asset, `processingStatus: PENDING`, enqueues analysis job
  - `GET /api/media`, `GET /api/media/:id`, `DELETE /api/media/:id`
  - `POST /api/media/:id/analyze` (manual retry / re-run)

## 5. AI provider abstraction (`server/services/ai/`)
- [ ] `AIProvider` interface: `analyzeImage()`, `generateSummary()`, `generateReport()`,
      `generateEmbedding()`, `compareImages()`
- [ ] One working implementation first (pick whichever provider the team has API access to)
- [ ] Output schema exactly matches `docs/architecture.md` §AI Metadata Schema
- [ ] Every AI attribute carries a confidence score — never presented as ground truth
      (see `docs/architecture.md` §AI Trust Principle: Observed / Inferred / Claimed)
- [ ] Graceful failure: if AI analysis fails, asset stays safe with `processingStatus: FAILED`
      and a retry option — never lose the original upload

## 6. Search API (`server/services/search/`)
- [ ] `GET /api/search?q=...` — MVP: LLM/keyword extraction (project, activity, objects, location,
      date, keywords) → MongoDB filter query → ranked results
- [ ] Stretch (only if ahead of schedule): embeddings + MongoDB Atlas Vector Search

## 7. Comparison API
- [ ] `POST /api/analysis/compare` — takes two media IDs, returns visual change score + AI observations
- [ ] `GET /api/projects/:id/comparisons`

## 8. Cross-cutting
- [ ] Rate limiting on public/auth routes
- [ ] All MongoDB indexes for the fields Search + Discovery will filter on
- [ ] Coordinate with Avani on the exact analysis/comparison payload shape before either side hardcodes it
- [ ] Coordinate with Atharv on report data contract (`docs/api.md` §Reports) before Phase 6

Check off items in `PROJECT_PLAN.md` as you complete each phase's backend pieces.
