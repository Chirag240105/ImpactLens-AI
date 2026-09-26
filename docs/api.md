# API Contract

Base URL: `/api`

## Authentication
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```
Roles: `ADMIN`, `PROJECT_MANAGER`, `VIEWER`

## Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```
Project fields: `name, description, organization, category, location, startDate, endDate, goals, status`

## Media
```
POST   /api/media/upload
GET    /api/media
GET    /api/media/:id
DELETE /api/media/:id
POST   /api/media/:id/analyze
```

## Search
```
GET /api/search?q=tree+plantation
```
Combinable filters: project, location, date, activity, object, environmental signal,
media type, confidence, before/after.

## Comparison
```
POST /api/analysis/compare        # { mediaIdBefore, mediaIdAfter } -> { visualChangeScore, observedChanges }
GET  /api/projects/:id/comparisons
```

## Timeline & Map (owned by Avnish, exposed via Chirag's routes)
```
GET /api/projects/:id/timeline
GET /api/projects/:id/locations
GET /api/projects/:id/coverage     # evidence coverage % + gap list
```

## Reports
```
POST /api/reports/generate
GET  /api/reports/:id
GET  /api/reports/public/:slug     # no auth required
```

---

## Frontend pages

```
/login
/dashboard
/projects
/projects/:id
/projects/:id/media          Evidence Explorer
/projects/:id/timeline
/projects/:id/compare
/projects/:id/insights
/projects/:id/report
/reports/:slug                public report
```

Keep this file in sync — whoever changes a route/response shape updates this doc in the same PR.
