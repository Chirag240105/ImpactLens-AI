# Charanjeet — Frontend + UX Lead

Owns: `client/src/pages`, `client/src/components`, `client/src/layouts`, design system.

## 1. App shell
- [ ] Routing (`react-router`) for all pages listed below
- [ ] `client/src/layouts/AppLayout.jsx` — sidebar nav (see `docs/architecture.md` §Dashboard UI):
      Dashboard, Projects, Media Intelligence, Evidence Explorer, Timeline, Comparisons, AI Insights, Reports, Settings
- [ ] Auth pages + guarded routes (`client/src/pages/Login.jsx`, protected route wrapper)

## 2. Design system (`client/src/components/`)
- [ ] Design direction: real-SaaS-product feel — clean typography, large media cards, minimal gradients,
      strong hierarchy. Avoid: neon, big "AI" logos, card overload, generic AI-dashboard look.
- [ ] `MediaCard.jsx` — thumbnail + AI tags + confidence badges
- [ ] `ConfidenceBadge.jsx` — visual confidence indicator (e.g. `Tree Plantation 94%`)
- [ ] `EvidenceBadge.jsx` — GPS Verified / User Provided / AI Estimated / Unknown
- [ ] Loading, empty, and error states for every list/grid view

## 3. Pages
- [ ] `/dashboard` — org/project overview
- [ ] `/projects` — all projects list + create-project form
- [ ] `/projects/:id` — project dashboard: KPI cards (total media, AI analyzed, activities,
      locations, before/after pairs, evidence coverage %)
- [ ] `/projects/:id/media` — Evidence Explorer: search bar + filter panel + media grid
- [ ] `/projects/:id/timeline` — timeline view (visual structure owned by Avani, page shell by you)
- [ ] `/projects/:id/compare` — Before/After slider + "AI-detected visual changes" panel
- [ ] `/projects/:id/insights` — AI-generated insights + Evidence Chain viewer
      (claim → source media → Cloudinary asset → AI model → timestamp)
- [ ] `/projects/:id/report` — report builder (trigger "Generate Impact Story" / "Generate Report")
- [ ] `/reports/:slug` — public report, no login required

## 4. Before/After slider
- [ ] Two-image slider component (`BeforeAfterSlider.jsx`)
- [ ] Displays visual change score + bullet list of AI-detected changes
- [ ] Wording must stay careful: "AI-detected visual difference", never "proven environmental improvement"

## 5. Search UX
- [ ] Natural-language search box on Evidence Explorer
- [ ] Filter chips for: project, location, date, activity, object, environmental signal,
      media type, confidence, before/after
- [ ] Empty state: "no evidence matched — try broadening filters"

## 6. Coordination
- [ ] Confirm API response shapes with Chirag before building each page (don't hardcode mock shapes
      that diverge from `docs/api.md`)
- [ ] Confirm timeline/map data shape with Avani
- [ ] Confirm report data shape with Atharv before building `/projects/:id/report`

Check off items in `PROJECT_PLAN.md` as each phase's UI lands.
