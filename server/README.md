# Server

Express + MongoDB + Cloudinary + AI services. Primary owner: **Chirag**
(support: Avnish on `services/analysis` + `jobs`, Atharv on `services/report`).

```
server/
├── controllers/     route handlers
├── routes/          route definitions, mounted in app.js
├── models/          mongoose schemas (User, Project, MediaAsset, Analysis, Report)
├── middleware/       auth guard, error handler, upload validation
├── services/
│   ├── cloudinary/  upload + transformation helpers
│   ├── ai/          AIProvider abstraction + implementation(s)
│   ├── search/       query understanding + mongo filter builder
│   ├── report/       report assembly + PDF export + public slug
│   └── analysis/     before/after pairing, comparison, coverage, gap detection
├── jobs/            background worker(s) for async AI analysis
├── utils/           helpers, seed script
└── app.js           Express app entrypoint
```

Run: `npm install && npm run dev` (copy `.env.example` from repo root to `.env` first).

See `/docs/api.md` for the route contract and `/docs/ai-pipeline.md` for the AI flow.
