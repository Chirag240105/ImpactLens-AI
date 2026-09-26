# Project Plan — Build Order

Work in this order. Each phase has a clear "deliverable" — don't move on until it's demoable.

## Phase 1 — Foundation (Owner: Chirag, support: everyone)
- [ ] Git repo + branch protection on `main`/`develop`
- [ ] MERN skeleton boots locally (client + server)
- [ ] MongoDB connection
- [ ] Auth: register / login / JWT / protected routes / roles (`ADMIN`, `PROJECT_MANAGER`, `VIEWER`)
- [ ] React routing skeleton (all pages from `docs/api.md` §Frontend Pages exist as empty stubs)
- [ ] Cloudinary connection verified (upload one test file)
- **Deliverable:** user can log in and create a project.

## Phase 2 — Media Pipeline (Owner: Chirag + Avani, UI: Chiranjeet)
- [ ] Image upload → Cloudinary
- [ ] Video upload → Cloudinary
- [ ] Media gallery (grid view)
- [ ] Media metadata stored (capture date, location, project link)
- [ ] `processingStatus` field: `PENDING → PROCESSING → COMPLETED / FAILED`
- **Deliverable:** user can upload real project evidence and see it listed against a project.

## Phase 3 — AI Intelligence (Owner: Chirag, support: Avani)
- [ ] AI provider abstraction (`analyzeImage`, `generateSummary`, `compareImages`, `generateEmbedding`)
- [ ] Image analysis: objects, activities, environmental signals, description
- [ ] AI confidence scores stored per attribute
- [ ] Background worker / job queue so uploads don't block on AI analysis
- **Deliverable:** upload image → AI understands image → metadata visible in UI.

## Phase 4 — Discovery (Owner: Chiranjeet UI, Chirag backend, Avani intelligence)
- [ ] Search API (`GET /api/search?q=...`) with natural-language → filter extraction
- [ ] Filters: project, location, date, activity, object, environmental signal, media type, confidence
- [ ] Evidence Explorer page
- [ ] Timeline generation (Avani)
- [ ] Map / location intelligence (Avani) — distinguish GPS Verified / User Provided / AI Estimated / Unknown
- **Deliverable:** user types "show me plantation activities" and gets relevant evidence back.

## Phase 5 — Impact Intelligence (Owner: Avani, UI: Chiranjeet, AI: Chirag)
- [ ] Before/After picker + slider UI
- [ ] Visual change analysis + AI-generated observations (worded as "AI-detected", not proof)
- [ ] Evidence Coverage calculation
- [ ] Evidence Gap Detection
- **Deliverable:** raw evidence becomes a measurable visual before/after insight.

## Phase 6 — Reporting (Owner: Atharv, AI/data: Chirag, UI: Chiranjeet)
- [ ] AI Impact Story generator
- [ ] PDF report generator
- [ ] Public report (no-login shareable URL, `impactlens.app/report/:slug`)
- [ ] Campaign content generator (social caption, exec summary, presentation summary)
- [ ] Evidence traceability block on every report (claim → source media → Cloudinary asset → AI model → timestamp)
- **Deliverable:** one click → professional impact report.

## Phase 7 — Polish (Owner: everyone, lead: Atharv)
- [ ] Loading / empty / error states everywhere
- [ ] Responsive UI pass
- [ ] Demo dataset seeded (see `docs/demo-script.md`)
- [ ] Security pass (rate limiting, input validation, file validation, no exposed keys)
- [ ] Performance pass (pagination, lazy-loaded images, indexes)
- [ ] Deployment + final walkthrough rehearsal

---

## MVP Priority (if time runs out, build in this order)

**Must have:** Auth · Project management · Cloudinary upload · AI image analysis + metadata ·
Media explorer · Search · Before/After · Impact dashboard · Evidence traceability · Report generation

**Should have:** Timeline · Map · Evidence gap detection · Public reports · Video analysis

**Nice to have:** Vector search · Advanced video understanding · Automated project classification ·
Multi-language reports · Advanced analytics · Real-time collaboration

## Explicitly out of scope (don't overbuild)

Social networking between users, in-app chat, full enterprise RBAC, payments, a huge admin panel,
training a custom ML model from scratch, microservices, Kubernetes.
