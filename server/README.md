# ImpactLens API server

Node 20 / Express 4 / CommonJS service backed by MongoDB and Cloudinary. The exported Express app is `app.js`; `server.js` handles connection, queue recovery, listening, and graceful shutdown.

From this directory, copy `../.env.example` to `.env`, set `MONGODB_URI` and `JWT_SECRET`, then run:

```sh
npm install
npm run dev
npm run seed
npm test
npm run smoke
```

`AI_PROVIDER=mock` works offline. Demo credentials and API contracts are in the root README and `../docs/api.md`. Deployment caveats and known partial integrations are documented in `../docs/deployment.md` and `../README.md`.
