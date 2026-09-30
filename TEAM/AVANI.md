# Avani Sharma — Media Intelligence + Data Visualization Engineer

Owns: `server/services/analysis`, `server/jobs`, media-processing logic, timeline/map/analytics
data shaping (visual components built together with Charanjeet).

## 1. Upload & metadata support
- [ ] EXIF GPS extraction from uploaded images (feeds Chirag's `MediaAsset.location`)
- [ ] Video handling support: frame extraction points for AI analysis (coordinate with Chirag's AI service)
- [ ] Media categorization helpers (map raw AI tags → activity categories used across the product)

## 2. Background jobs (`server/jobs/`)
- [ ] Job queue / worker for async AI analysis so uploads never block (`PENDING → PROCESSING → COMPLETED/FAILED`)
- [ ] Retry logic for failed analysis jobs

## 3. Timeline intelligence
- [ ] Group project media by captureDate into a month-by-month timeline structure
      (see `docs/architecture.md` §Timeline Intelligence for the target shape)
- [ ] API contract: `GET /api/projects/:id/timeline` → months with activities/asset counts
- [ ] Handoff to Charanjeet: agree on the exact JSON shape before she builds `/projects/:id/timeline`

## 4. Location intelligence
- [ ] Location source resolution: GPS Verified > User Provided > AI Estimated > Unknown
      (never present AI-estimated location as exact ground truth)
- [ ] Map data endpoint (project locations + counts) for the map view

## 5. Before/After pairing + comparison engine (`server/services/analysis/`)
- [ ] Auto-suggest before/after pairs (same project, same rough location, different capture dates)
- [ ] Visual similarity/difference scoring between two assets
- [ ] Output: `{ visualChangeScore, observedChanges: [...] }` — wording stays as "AI-detected visual
      difference", never a claim of measured environmental improvement
- [ ] Feed into Chirag's `POST /api/analysis/compare` endpoint (agree on request/response shape early)

## 6. Evidence Coverage + Gap Detection
- [ ] Define expected evidence categories per project category (e.g. plantation project →
      site prep, plantation, watering, community participation, follow-up)
- [ ] Coverage % calculation: found categories / expected categories
- [ ] Gap detection: flag missing categories, especially "no later-stage media found" for
      growth/impact-over-time projects
- [ ] Output feeds both the project dashboard KPI and the Evidence Gap warning panel

## 7. Analytics for the dashboard
- [ ] KPI aggregation: total media, AI analyzed count, activity count, location count,
      before/after pair count, evidence coverage %
- [ ] "AI Impact Signals" bar data (vegetation / community / water / waste-reduction style scores)

## Coordination
- [ ] Agree on MediaAsset and analysis schemas with Chirag before writing queries against them
- [ ] Agree on timeline/map/coverage JSON shapes with Charanjeet before she wires up the UI
