# ImpactLens client

React 18 + TypeScript single-page app for the ImpactLens evidence workspace. The visual system is
specified in [`/DESIGN.md`](../DESIGN.md); tokens live in `src/styles/tokens.css`.

## Run it

```bash
# 1. API (from repo root) — offline demo mode against a local MongoDB
cd server
MONGODB_URI=mongodb://127.0.0.1:27017/impactlens_dev CLOUDINARY_MODE=mock AI_PROVIDER=mock npm run seed
MONGODB_URI=mongodb://127.0.0.1:27017/impactlens_dev CLOUDINARY_MODE=mock AI_PROVIDER=mock npm run dev

# 2. Client (new terminal)
cd client
npm install
npm run dev            # http://localhost:3000 — /api is proxied to http://localhost:5000
```

Sign in with a seeded demo account (the login page has one-click buttons):
`manager@impactlens.demo / Manager123!` (create, upload, report), `admin@…` (all projects),
`viewer@…` (read-only).

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 3000 with `/api` proxy (`VITE_API_PROXY_TARGET` to change the target) |
| `npm run build` | Type-check (`tsc --noEmit`) then production build to `dist/` |
| `npm run preview` | Serve the production build on port 3000 (same `/api` proxy) |
| `npm run lint` / `typecheck` | ESLint 9 + typescript-eslint / TypeScript strict |
| `npm test` | Vitest + Testing Library + MSW unit/integration tests |
| `npm run test:e2e` | Playwright: judge walkthrough, RBAC, axe WCAG A/AA and mobile-overflow smoke. Boots a seeded mock-mode API on `impactlens_e2e` (needs local MongoDB; override with `E2E_MONGODB_URI`) |

Environment (all optional): `VITE_API_BASE_URL` (default `/api`), `VITE_API_PROXY_TARGET`,
`VITE_MAX_UPLOAD_MB`, `VITE_QUERY_DEVTOOLS=true` to show TanStack Query devtools.

## Architecture

```
src/
├── api/          client.ts (axios, error normalisation, 401 → session end), endpoints.ts,
│                 types.ts (API contracts), queries.ts (key factory + queryOptions), mutations.ts
├── store/        auth.ts (session state only — the JWT lives in an httpOnly cookie), ui.ts (theme, layout prefs)
├── layouts/      AppLayout (sidebar, ⌘K, mobile drawer), ProjectLayout (+ useProject), AuthLayout, Guards
├── pages/        one file per route (lazy-loaded) — see router.tsx
├── components/
│   ├── ui/       Button, Badge, Card, Form (Field wires label/aria), Overlay (Dialog/Drawer/Confirm), Feedback, Misc
│   ├── evidence/ MediaCard, MediaThumb, trust badges, MediaDrawer, UploadDialog, BeforeAfterSlider, MediaPickerDialog
│   └── report/   ReportDocument (shared by the report viewer and the public page), Reveal
├── lib/          utils (cn, formatters), constants (mirrors shared/constants), schemas (zod), projectForm
└── styles/       tokens.css (DESIGN.md §2) + index.css (Tailwind v4 theme mapping, base, motion)
```

- **Server state** is TanStack Query v5 only; views poll automatically while media is `PENDING`/`PROCESSING`.
- **URL state** holds search, filters, pagination, the open media drawer (`?media=`), upload dialog
  (`?upload=1`), compare pair (`?before=&after=`) and trace drawer (`?trace=`), so every view is linkable.
- **Auth**: the API sets an httpOnly `token` cookie on login; the client sends `X-Requested-With` on every
  request (required by the server's CSRF guard) and never stores a token.
- **RBAC** mirrors the server: write actions are hidden for `VIEWER`.

## Routes

| Route | Page |
|---|---|
| `/login`, `/register` | Auth (guest only) |
| `/dashboard` | Organisation overview, projects, recent activity |
| `/projects` | Project list, search/status filter, create |
| `/projects/:id` | Overview: KPIs, live analysis progress, coverage, evidence gaps, activity & environmental signals |
| `/projects/:id/evidence` | Evidence Explorer: natural-language search, filters, grid/list, upload, media drawer |
| `/projects/:id/timeline` | Month-by-month captures |
| `/projects/:id/locations` | Map (Leaflet/OSM) + location provenance |
| `/projects/:id/compare` | Before/after slider, AI-detected visual difference, pair suggestions, history |
| `/projects/:id/insights` | Observed/Inferred/Claimed insights + evidence-chain trace |
| `/projects/:id/reports[/:reportId]` | Report builder, story & campaign copy, report viewer, PDF, publish |
| `/projects/:id/settings` | Edit project, expected evidence categories, archive |
| `/settings` | Profile, theme, service status |
| `/reports/:slug` | Public shared report (no login) |

## Quality gates (verified locally)

- 25 unit/integration tests, E2E walkthrough + RBAC + smoke (desktop and Pixel 7).
- axe-core: 0 WCAG 2 A/AA violations on 13 routes, light and dark themes.
- No horizontal overflow at 390 px and 768 px on any route.
- Route-level code splitting; Leaflet loads only on the Locations page.
