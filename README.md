# ImpactLens AI

**AI-Powered Impact & Sustainability Media Intelligence Platform**
Built for Code Cubicle · Problem Statement 02 · Cloudinary

> Turns raw field photos and videos into searchable, traceable visual evidence — and turns that evidence into
> impact stories, before/after comparisons, and shareable reports.

---

## 1. Team & Ownership

| Member | Role | Folder(s) they own |
|---|---|---|
| **Chirag** | Backend + AI Architecture + Integration Lead | `server/controllers`, `server/routes`, `server/models`, `server/services/ai`, `server/services/cloudinary` |
| **Chiranjeet** | Frontend + UX Lead | `client/src/pages`, `client/src/components`, `client/src/layouts` |
| **Avani** | Media Intelligence + Data Visualization | `server/services/analysis`, `server/jobs`, timeline/map UI pieces in `client/src` |
| **Atharv** | DevOps + Testing + Reports + Product | `server/services/report`, `.github/`, deployment config, demo data, docs |

Full task checklists live in `/TEAM/<name>.md`. Read yours first.

## 2. How to use this repo

1. Clone the repo.
2. Read `PROJECT_PLAN.md` for the phase order — **do not jump ahead of Phase 1**.
3. Open your file in `/TEAM/` and work through the checklist top to bottom.
4. Create a branch per feature (see naming convention below), commit, open a PR into `develop`.
5. Never commit `.env` — copy `.env.example` to `.env` locally.

```bash
# backend
cd server && npm install && npm run dev

# frontend
cd client && npm install && npm run dev
```

## 3. Branch naming

```
feature/auth
feature/media-upload
feature/ai-analysis
feature/dashboard
feature/search
feature/comparison
feature/reports
feature/deployment
```

Workflow: `feature branch → PR → review → develop → final testing → main`

## 4. Repo map

```
ImpactLens-AI/
├── client/                 Chiranjeet (+ Avani for viz components)
├── server/                 Chirag (+ Avani for analysis/jobs, Atharv for report)
├── shared/constants/       shared enums/constants used by both client & server
├── docs/                   architecture, API contract, AI pipeline, schema, demo script
├── TEAM/                   per-person task checklists
├── PROJECT_PLAN.md         phase-by-phase build order + MVP priority
└── .env.example            required environment variables
```

## 5. One-sentence pitch

> ImpactLens AI turns raw field media into searchable, traceable visual evidence and transforms that
> evidence into meaningful sustainability impact stories.

See `docs/architecture.md`, `docs/api.md`, and `docs/ai-pipeline.md` for technical detail, and
`docs/demo-script.md` for the judge-facing walkthrough.
