const { config } = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * Text embeddings for semantic evidence search (Gemini `gemini-embedding-001`, 768 dims).
 * Returns null when no Gemini key is configured, so callers fall back to keyword search.
 */
const MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
const DIMS = 768;
const enabled = () => config.aiProvider === 'gemini' && Boolean(config.aiApiKey);

const normalise = (v) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

async function embedTexts(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  if (!enabled() || !texts.length) return null;
  const out = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': config.aiApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: `models/${MODEL}`,
            content: { parts: [{ text: String(text).slice(0, 8000) }] },
            taskType,
            outputDimensionality: DIMS,
          })),
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    const j = await r.json();
    if (!r.ok)
      throw Object.assign(new Error(j.error?.message || 'Embedding failed'), { status: r.status });
    out.push(...j.embeddings.map((e) => normalise(e.values)));
  }
  return out;
}

/** The searchable description of an asset, built from its AI analysis and metadata. */
function assetText(a) {
  const names = (list) => (list || []).map((x) => x.name).join(', ');
  return [
    a.aiDescription,
    a.aiSummary,
    names(a.activities) && `Activities: ${names(a.activities)}`,
    names(a.objects) && `Objects: ${names(a.objects)}`,
    names(a.environmentalSignals) && `Environment: ${names(a.environmentalSignals)}`,
    (a.tags || []).length && `Tags: ${a.tags.join(', ')}`,
    a.location?.name && `Place: ${a.location.name}`,
    ...(a.observedInferred?.observed || []),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Embeds and stores vectors for analyzed assets that don't have one yet (or were re-analyzed). */
async function embedAssets(assets) {
  if (!enabled() || !assets.length) return 0;
  try {
    const vectors = await embedTexts(assets.map(assetText));
    await Promise.all(
      assets.map((a, i) =>
        require('../../models/MediaAsset').updateOne(
          { _id: a._id },
          { $set: { embedding: vectors[i], embeddingModel: MODEL } },
        ),
      ),
    );
    return assets.length;
  } catch (err) {
    logger.warn({ err: err.message }, 'Embedding failed; keyword search still works');
    return 0;
  }
}

// Small in-process cache so repeated searches don't re-embed the same query.
const queryCache = new Map();
async function embedQuery(text) {
  const key = text.trim().toLowerCase();
  if (queryCache.has(key)) return queryCache.get(key);
  const [v] = (await embedTexts([key], 'RETRIEVAL_QUERY')) || [];
  if (v) {
    queryCache.set(key, v);
    if (queryCache.size > 500) queryCache.delete(queryCache.keys().next().value);
  }
  return v || null;
}

const cosine = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

module.exports = { embedTexts, embedAssets, embedQuery, assetText, cosine, enabled, MODEL };
