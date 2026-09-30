# API reference

Base path: `/api`. Success responses use `{ success:true, data, meta }`; errors use `{ success:false, error:{code,message,details} }`. Protected routes accept `Authorization: Bearer <JWT>` or the httpOnly `token` cookie set by login/register; cookie-authenticated writes must also send `X-Requested-With: XMLHttpRequest` (otherwise `403 CSRF_REJECTED`). List endpoints accept `page` (default 1) and `limit` (default 20, maximum 100). Multipart upload uses fields `projectId`, optional `evidenceType`, `captureDate`, `location` (JSON `{lat,lng,name}`), and one or more files named `files`.

Frontend-facing response details:

- Media lists (`/media`, `/search`) omit `secureUrl` and include `thumbnailUrl` and `previewUrl` (Cloudinary transforms for real assets; the source URL in demo mode). `GET /media/:id` includes both plus `secureUrl`.
- `/media` and `/search` filters: `evidenceType`, `resourceType`, `processingStatus`, `activity`, `object`, `signal`, `location`, `locationSource`, `minConfidence` (0–1), `from`, `to`. User-supplied patterns are regex-escaped.
- **Semantic search:** with a Gemini key, `/search` embeds the query (`gemini-embedding-001`) and ranks the filtered set by cosine similarity (≥ 0.63, within 0.1 of the best match), blended 70/30 with keyword matches; `queryUnderstanding.mode` is `semantic` or `keyword`, and items carry `semanticScore`.
- **Integrity and SDGs:** media lists scoped to a project, and `GET /media/:id`, include `integrity: { score, flags[] }`; the detail also includes `sdgs` (goal, name, matched terms) and, for Cloudinary videos, `frameUrls`. Project dashboards and reports include integrity and SDG summaries.
- `/search?q=` (keyword mode) drops filler words ("show", "evidence of", …), matches the remaining terms across tags, descriptions, summaries, file names, activities, objects, signals and place names over the whole filtered set, ranks by matched terms, then paginates. Items carry `searchScore` (0–1) and `matchedTerms`; `queryUnderstanding.keywords` lists the terms used.
- `pair-suggestions` and `comparisons` embed `before`/`after` media cards; pairs prefer later captures at the same named location and include a `reason`.
- Timeline months include a readable `label` ("Jan 2026"), `evidenceTypes` counts and up to four `highlights`.
- `/dashboard/overview` adds `activeProjectCount`, `analyzedCount`, `pendingCount`, `failedCount`, `reportCount` and `recentActivity`.
- `POST /projects/:id/insights/generate` skips insights that already exist and adds per-activity insights citing every supporting asset.
- Reports add `kpis` and `coverage`; `GET /reports/:id/pdf` returns a sectioned PDF as an attachment. Public report DTOs keep dates and IDs as strings.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | API, database, Cloudinary configuration, and AI mode status |
| POST | `/auth/register` | No | Register user; first registered user is ADMIN, later users VIEWER |
| POST | `/auth/login` | No | Login; returns bearer token and safe user DTO |
| GET | `/auth/me` | User | Current safe user DTO |
| POST | `/auth/logout` | User | Stateless logout acknowledgement |
| GET, POST | `/projects` | User / manager | List or create projects |
| GET, PATCH, DELETE | `/projects/:id` | User / manager | Read, update, or archive project |
| POST | `/projects/:id/analyze` | Manager | Queue project assets for analysis |
| GET | `/projects/:id/processing-status` | User | Counts grouped by processing state |
| GET | `/projects/:id/dashboard` | User | Project KPIs |
| GET | `/projects/:id/timeline` | User | Capture-date grouped timeline |
| GET | `/projects/:id/locations` | User | Location counts and source labels |
| GET | `/projects/:id/coverage` | User | Expected category coverage and evidence gaps |
| GET | `/projects/:id/integrity` | User | Evidence integrity score, flags by type, flagged assets |
| GET | `/projects/:id/sdgs` | User | Evidence aligned with UN Sustainable Development Goals |
| GET | `/projects/:id/comparisons` | User | Saved comparisons |
| GET | `/projects/:id/pair-suggestions` | User | Before/after candidates |
| GET, POST | `/projects/:id/insights`, `/projects/:id/insights/generate` | User / manager | List or generate traceable insights |
| GET | `/projects/:id/reports` | User | Paginated project reports |
| POST | `/media/sign` | Manager | Reserved direct-upload endpoint (currently returns 501) |
| POST | `/media/upload` | Manager | Multipart upload, creates asset and enqueues AI |
| GET | `/media` | User | Paginated, filtered media list (URLs omitted from list) |
| GET, PATCH, DELETE | `/media/:id` | User / manager | Read, correct metadata, or delete media |
| POST | `/media/:id/analyze` | Manager | Retry analysis |
| GET | `/search` | User | Keyword search and filters (`q`, `projectId`, activity, object, date) |
| POST | `/analysis/compare` | User | Compare `{beforeId, afterId}` |
| GET | `/insights/:id/trace` | User | Insight to source media and AI metadata trace |
| GET | `/dashboard/overview` | User | Organization/project overview |
| POST | `/reports/generate` | Manager | Generate structured report for `{projectId}` |
| POST | `/reports/story`, `/reports/campaign` | Manager | Story and campaign content |
| GET | `/reports/:id` | User | Read report |
| GET | `/reports/:id/pdf` | User | Generates a simple PDF with PDFKit |
| PATCH | `/reports/:id/publish` | Manager | Publish sanitized public share DTO |
| GET | `/reports/public/:slug` | No | Sanitized, cacheable public report |

Roles: ADMIN can access all projects; PROJECT_MANAGER can modify projects they created; VIEWER is read-only. Registration is open for local demo and assigns VIEWER after the first account. In production, disable public registration or add invitation/organization provisioning.

## Error codes

`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_CREDENTIALS`, `INVALID_FILE`, `INTERNAL_ERROR`. Validation details contain field names and messages, never secrets.
