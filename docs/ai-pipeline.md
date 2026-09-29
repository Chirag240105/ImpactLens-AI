# AI and evidence pipeline

Uploads are signature checked, sent through the Cloudinary adapter or demo placeholder, persisted as `PENDING`, then queued. The worker marks `PROCESSING`, saves model metadata and `COMPLETED`; failures preserve the asset, mark it `FAILED`, and can be retried via `POST /api/media/:id/analyze`.

`AIProvider` defines analysis, comparison, summary, and query-understanding methods. `MockProvider` is deterministic and works offline. OpenAI-compatible provider wiring exists for OpenAI and Groq. Gemini credentials are accepted but the Gemini SDK adapter is not implemented yet. Query understanding and search are keyword based. Embeddings/vector search are not enabled.

The model stores `observedInferred.observed` separately from `.inferred`; confidence expresses model confidence, not proof. Comparisons are described as AI-detected visual differences. Reports include a verification disclaimer. Claimed facts should come from human project records.
