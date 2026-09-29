# AI and evidence pipeline

## Upload and storage

Uploads are checked by file signature. When Cloudinary is configured they're stored there with `image_metadata` (EXIF: capture date, GPS) and a perceptual hash (`phash`) for duplicate detection. The server pings Cloudinary at startup; if the credentials are missing or rejected, files are stored on local disk and served from `/api/uploads`, so real uploads and analysis still work. Settings and `/api/health` report `cloudinary: configured | misconfigured | demo-mode`.

Each asset is saved as `PENDING` and queued. The worker marks it `PROCESSING`, then saves the model metadata as `COMPLETED`. On failure the asset is kept, marked `FAILED`, and can be retried with `POST /api/media/:id/analyze`.

## Providers

`services/ai/` holds interchangeable providers: `GeminiProvider`, `OpenAIProvider` (also used for OpenRouter), `GroqProvider` and the offline `MockProvider`. `AI_PROVIDER` selects one; with a `GEMINI_API_KEY` and no explicit choice, Gemini is used. Missing methods fall back to the mock.

**Gemini** (`gemini-2.5-flash` by default, falling back to `-flash-lite` and `flash-latest`):

- **Image analysis** returns JSON constrained by a response schema: `description`, `tags`, `objects`, `activities` and `environmentalSignals`, each item with its own confidence, plus separate `observed` and `inferred` statements, `aiSummary`, `aiConfidence`, `isFieldEvidence`, and an `estimatedPlace` read only from visible signage or landmarks.
- **Prompt context:** the project's name, category and expected evidence categories are sent, so activity names line up with coverage measurement. File names are passed but marked as possibly meaningless.
- **Before/after comparison** sends both images and returns `sameScene`, `visualChangeScore`, observed changes, inferred notes and confidence.
- **Impact story and campaign copy** are generated from an evidence digest built from the database: counts, activities, locations, date range, coverage gaps, sample observations and insights. Nothing is taken from free text.
- **Reliability:** rate-limit and 5xx errors are retried with backoff; unavailable models fall through to the next. Per-image tagging runs with the thinking budget off for speed.

**Media input:** local files are read from disk, Cloudinary images use a 1600px derivative, and videos are analyzed from a mid-point frame (Cloudinary only). External open-licence images use their source URL.

## Trust rules

- **Observed vs inferred:** `observed` is only what is visible; `inferred` is interpretation, phrased with "may" or "likely". Claimed facts come from human project records.
- **Confidence** is the model's calibrated certainty, capped at 0.95 so it never reads as proof.
- **Locations:** a place the model reads from the image is stored only as `AI_ESTIMATED`, and never overrides GPS or user-provided locations.
- **Wording:** comparisons are described as AI-detected visual differences, and reports carry a verification disclaimer.

## Demo dataset

`npm run seed:real` imports the openly licensed Wikimedia Commons photos listed in `server/utils/seed-data/real-dataset.json`:

- **Dates and GPS** come from each file's EXIF, read from the first 256 KB of the original, or from its Commons metadata.
- **Place names** given by the uploader are stored as `USER_PROVIDED`.
- **Author and licence** are stored per asset and shown in the evidence panel.
- **Analysis and insights** are generated with the configured provider.

`npm run seed` remains the synthetic, offline fixture used by the automated tests.
