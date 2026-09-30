# ImpactLens API

Express 4 (CommonJS) service backed by MongoDB, Cloudinary and a pluggable AI provider. `app.js` exports the Express app; `server.js` connects to the database, verifies Cloudinary, recovers queued analysis jobs, and handles graceful shutdown.

## Run locally

Settings are read from `server/.env` if present, otherwise from the repository root `.env` (copy `../.env.example`). At minimum set `MONGODB_URI` and `JWT_SECRET`.

```sh
npm install
npm run seed:real   # real openly licensed demo photos, analysed with the configured provider
npm run dev         # http://localhost:5000/api
```

`AI_PROVIDER=mock` with `CLOUDINARY_MODE=mock` runs fully offline; `npm run seed` loads the synthetic fixture used by the tests.

## Layout

| Folder | Contents |
|---|---|
| `routes/`, `controllers/`, `middleware/` | HTTP layer: validation, auth, RBAC, CSRF guard, rate limits |
| `models/` | Mongoose schemas: users, projects, media assets, analyses, insights, reports |
| `services/ai/` | Gemini, OpenAI/OpenRouter, Groq and mock providers; embeddings |
| `services/cloudinary/` | Upload with local-disk fallback, transforms (thumbnails, frames, composites) |
| `services/integrity/`, `services/sdg/` | Duplicate and metadata checks, UN SDG alignment |
| `services/report/` | Report assembly and PDF export |
| `jobs/` | Media analysis queue with retries and quota handling |
| `utils/` | Seeders, EXIF parsing, smoke test |

## Quality

```sh
npm test            # Jest + mongodb-memory-server
npm run lint
npm run smoke       # end-to-end check against a running, seeded API
```

API contracts: [../docs/api.md](../docs/api.md) · deployment: [../docs/deployment.md](../docs/deployment.md).
