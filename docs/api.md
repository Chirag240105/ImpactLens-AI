# API reference

Base path: `/api`. Success responses use `{ success:true, data, meta }`; errors use `{ success:false, error:{code,message,details} }`. Protected routes use `Authorization: Bearer <JWT>`. List endpoints accept `page` (default 1) and `limit` (default 20, maximum 100). Multipart upload uses fields `projectId`, optional `evidenceType`, and one or more files named `files`.

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
