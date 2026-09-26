# Client

React frontend. Primary owner: **Chiranjeet** (support: Avnish for timeline/map/analytics
visual components).

```
client/src/
├── components/   reusable UI (MediaCard, ConfidenceBadge, EvidenceBadge, BeforeAfterSlider, ...)
├── pages/        one file per route in /docs/api.md §Frontend pages
├── layouts/       AppLayout (sidebar nav), PublicLayout (for /reports/:slug)
├── hooks/         data-fetching + state hooks
├── services/      axios API client wrappers, one per backend resource
├── store/         global state (zustand or redux — pick one and stick to it)
└── utils/         formatting helpers, constants re-exports
```

Run: `npm install && npm run dev`. Configure `VITE_API_BASE_URL` in `.env` (see repo-root `.env.example`).

Design direction lives in `/docs/architecture.md` §Design Direction — real SaaS product feel,
not a hackathon dashboard.
