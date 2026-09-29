# Deployment

Deploy `server/` as a Node 20 service on Render or Railway, with managed MongoDB. Set the variables in the root `.env.example`; use a strong random `JWT_SECRET`, production `MONGODB_URI`, exact `CLIENT_URL`, and desired `PUBLIC_REPORT_BASE_URL`. Store Cloudinary and AI credentials in the host secret manager. `AI_PROVIDER=mock` and `CLOUDINARY_MODE=mock` support an offline demo.

Build: `npm install`. Start: `npm start`. Health check: `/api/health`. Restrict MongoDB access to deployment egress ranges, configure TLS/domains, and align the public share URL with the frontend route. Compose is for local use only.

Before production, verify Cloudinary uploads/deletes, Gemini adapter, model output, PDF generation, backups/retention, performance, and public-report privacy.
