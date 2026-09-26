# AI Pipeline

## Flow

```
Upload → Cloudinary → Create MediaAsset (processingStatus=PENDING)
  → Background Worker → AI Analysis → MongoDB Update (processingStatus=COMPLETED)
```

## Provider abstraction

Do not couple the app to one AI vendor. Build an interface:

```js
AIProvider {
  analyzeImage()
  generateSummary()
  generateReport()
  generateEmbedding()
  compareImages()
}
```

Swappable implementations (pick one to start, keep the interface stable):
Gemini · Groq · OpenAI · a local vision model.

## What image analysis extracts

- **Objects** — e.g. person, tree, water, waste, solar panel, construction equipment
- **Activities** — e.g. tree plantation, cleaning, construction, waste collection, community meeting
- **Environmental signals** — e.g. vegetation, water body, waste accumulation, green coverage
- **Context** — a one/two-sentence plain description of what's happening
- **Confidence** — a score per object/activity/signal, never presented as proof

## Semantic search (MVP → stretch)

**MVP:**
```
User query → LLM query understanding → extract {project, activity, objects, location, date, keywords}
  → MongoDB filtering → ranking → results
```

**Stretch (only if ahead of schedule):**
```
Media → embedding model → vector DB (e.g. MongoDB Atlas Vector Search) → semantic retrieval
```
This lets a query like "community involvement" match assets tagged `volunteers`, `people`,
`meeting`, `plantation` even without exact keyword overlap.

## Change / comparison analysis

```
Image A → feature extraction → Image B → feature extraction → similarity/difference → AI explanation
```
Output wording stays careful: **"AI-detected visual difference"**, not a scientific claim of
measured environmental improvement — unless real measurements back it up.

## Failure handling

AI analysis can fail. It must never take the original upload down with it:

```
"AI analysis failed. The original media is safe. You can retry analysis."
```
`processingStatus` moves to `FAILED`; a retry action calls `POST /api/media/:id/analyze` again.
