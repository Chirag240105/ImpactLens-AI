const { GoogleGenerativeAI, SchemaType: T } = require('@google/generative-ai');
const { config } = require('../../config/env');
const logger = require('../../utils/logger');

// Vision-capable models tried in order. Free-tier quotas (e.g. 20 requests/day) are per model, so a
// pool keeps analysis running when one model is exhausted. Override with GEMINI_MODELS=a,b,c.
const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
];
const MAX_IMAGE_BYTES = 18 * 1024 * 1024; // inline media limit (Gemini allows ~20 MB per request)

const scored = {
  type: T.ARRAY,
  items: {
    type: T.OBJECT,
    properties: {
      name: { type: T.STRING },
      confidence: { type: T.NUMBER, description: 'Model confidence 0-1, not proof' },
    },
    required: ['name', 'confidence'],
  },
};

const ANALYSIS_SCHEMA = {
  type: T.OBJECT,
  properties: {
    isFieldEvidence: {
      type: T.BOOLEAN,
      description:
        'False for screenshots, documents, selfies or images unrelated to project field work',
    },
    description: {
      type: T.STRING,
      description: 'One or two factual sentences about what is visible',
    },
    tags: { type: T.ARRAY, items: { type: T.STRING } },
    objects: scored,
    activities: scored,
    environmentalSignals: scored,
    observed: {
      type: T.ARRAY,
      items: { type: T.STRING },
      description: 'Only things directly visible in the image',
    },
    inferred: {
      type: T.ARRAY,
      items: { type: T.STRING },
      description: 'Interpretations that go beyond what is visible, phrased with may/likely',
    },
    aiSummary: { type: T.STRING },
    aiConfidence: { type: T.NUMBER },
    estimatedPlace: {
      type: T.STRING,
      description:
        'Only if a place is clearly identifiable from visible signage or landmarks, else empty',
    },
  },
  required: [
    'isFieldEvidence',
    'description',
    'tags',
    'objects',
    'activities',
    'environmentalSignals',
    'observed',
    'inferred',
    'aiSummary',
    'aiConfidence',
  ],
};

const COMPARE_SCHEMA = {
  type: T.OBJECT,
  properties: {
    sameScene: {
      type: T.BOOLEAN,
      description: 'Whether both images plausibly show the same place',
    },
    visualChangeScore: {
      type: T.NUMBER,
      description: '0 = no visible change, 1 = completely different',
    },
    observedChanges: { type: T.ARRAY, items: { type: T.STRING } },
    inferredNotes: { type: T.ARRAY, items: { type: T.STRING } },
    confidence: { type: T.NUMBER },
  },
  required: ['sameScene', 'visualChangeScore', 'observedChanges', 'inferredNotes', 'confidence'],
};

const CAMPAIGN_SCHEMA = {
  type: T.OBJECT,
  properties: {
    socialCaption: { type: T.STRING },
    websiteStory: { type: T.STRING },
    executiveSummary: { type: T.STRING },
    presentationSummary: { type: T.STRING },
  },
  required: ['socialCaption', 'websiteStory', 'executiveSummary', 'presentationSummary'],
};

const TRUST_RULES = `Rules:
- You are describing field evidence for an impact-reporting platform. Never claim impact is proven or measured.
- "observed" lists only what is directly visible. "inferred" lists interpretations, phrased with "may" or "likely".
- Confidence values are calibrated certainty between 0 and 0.95 (never 1). Use ~0.9 only when unmistakable, 0.6-0.8 when likely, below 0.5 when unsure.
- Do not invent numbers, names, organisations or locations that are not visible.`;

// Visual AI is never certain: cap confidences so 100% can't read as proof.
const MAX_CONFIDENCE = 0.95;
const clamp01 = (n) =>
  Math.max(0, Math.min(MAX_CONFIDENCE, Number.isFinite(Number(n)) ? Number(n) : 0));
const strings = (v, max = 12) =>
  (Array.isArray(v) ? v : [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, max);
const scores = (v, max = 10) =>
  (Array.isArray(v) ? v : [])
    .filter((x) => x && x.name)
    .map((x) => ({ name: String(x.name).trim().slice(0, 80), confidence: clamp01(x.confidence) }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, max);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const statusOf = (err) =>
  err?.status || Number(String(err?.message || '').match(/\[(\d{3})/)?.[1]) || 0;

/**
 * Loads media for inline upload: accepts {data, mimeType} directly or fetches a URL. Videos are
 * sent whole (Gemini watches the clip); a video that is too large falls back to `fallbackUrl`.
 */
async function toInlinePart(image) {
  if (image?.data)
    return {
      inlineData: {
        data: Buffer.from(image.data).toString('base64'),
        mimeType: image.mimeType || 'image/jpeg',
      },
    };
  const url = typeof image === 'string' ? image : image?.url;
  if (!url) throw new Error('No image supplied for analysis');
  const isVideo = image?.kind === 'video';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), isVideo ? 60000 : 20000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ImpactLens/1.0 (evidence analysis)' },
    });
    if (!r.ok) throw new Error(`Media fetch failed (${r.status})`);
    const buf = Buffer.from(await r.arrayBuffer());
    const mimeType = r.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    if (buf.length > MAX_IMAGE_BYTES) {
      if (image?.fallbackUrl) return toInlinePart({ url: image.fallbackUrl, kind: 'image' });
      throw new Error('Media is too large to analyze');
    }
    if (!mimeType.startsWith('image/') && !(isVideo && mimeType.startsWith('video/')))
      throw new Error(`Expected an image but got ${mimeType}`);
    return { inlineData: { data: buf.toString('base64'), mimeType } };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Process-wide pacing: at most GEMINI_RPM requests per minute (free tier is ~10), so bursts of
 * uploads queue politely instead of tripping 429s and burning quota on retries.
 */
const MIN_INTERVAL_MS = Math.ceil(60000 / Math.max(1, config.geminiRpm));
let nextSlot = 0;
async function paced() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_INTERVAL_MS;
  if (at > now) await sleep(at - now);
}
const retryDelayMs = (err) => {
  const m = String(err?.message || '');
  const s = Number(m.match(/retry in ([\d.]+)s/i)?.[1] || m.match(/"retryDelay":"(\d+)s"/)?.[1]);
  return Number.isFinite(s) && s > 0 ? s * 1000 : 0;
};

// Models that hit a daily cap (or are unavailable to this key) are skipped until this time.
const unavailableUntil = new Map();
/** Free-tier daily quotas reset at midnight Pacific; 08:00 UTC is a safe upper bound. */
const nextDailyReset = () => {
  const d = new Date();
  d.setUTCHours(8, 0, 0, 0);
  if (d <= new Date()) d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime();
};
const isDailyQuota = (err) =>
  /PerDay/i.test(String(err?.message || '') + JSON.stringify(err?.errorDetails || ''));

class GeminiProvider {
  constructor() {
    this.client = new GoogleGenerativeAI(config.aiApiKey);
    const pool = config.geminiModels.length ? config.geminiModels : DEFAULT_MODELS;
    this.models = [...new Set([config.aiModel, ...pool].filter(Boolean))];
    this.lastModel = this.models[0];
  }

  /**
   * Runs a JSON-schema-constrained request. Retries rate limits / transient errors with backoff and
   * falls through to lighter models if the preferred one is unavailable.
   */
  async generate(parts, schema, { temperature = 0.2, think = true } = {}) {
    let lastErr;
    let dailyCapped = 0;
    for (const modelName of this.models) {
      if ((unavailableUntil.get(modelName) || 0) > Date.now()) {
        dailyCapped++;
        continue;
      }
      const model = this.client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature,
          // Per-image tagging doesn't need reasoning tokens; comparisons and stories keep them.
          ...(!think && /^gemini-2\.5/.test(modelName)
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      });
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await paced();
          const out = await model.generateContent(parts);
          this.lastModel = modelName;
          return JSON.parse(out.response.text());
        } catch (err) {
          lastErr = err;
          const status = statusOf(err);
          if (status === 429 && isDailyQuota(err)) {
            // Daily cap: waiting won't help today, so park this model and move on immediately.
            unavailableUntil.set(modelName, nextDailyReset());
            dailyCapped++;
            logger.warn({ model: modelName }, 'Gemini daily quota reached; switching model');
            break;
          }
          if (status === 429) {
            // Per-minute limit: honour the server's retry hint once (pacing pushes every later
            // request back too), then move to the next model, whose free-tier quota is separate.
            const wait = retryDelayMs(err) || 20000;
            logger.warn({ model: modelName, wait }, 'Gemini rate limited; waiting');
            if (attempt >= 1) break;
            nextSlot = Math.max(nextSlot, Date.now() + Math.min(wait, 60000));
            continue;
          }
          if (status >= 500) {
            // Overloaded model: short backoff, then fall through to the next (lighter) model.
            logger.warn({ model: modelName, status, attempt }, 'Gemini overloaded; retrying');
            if (attempt >= 1) break;
            await sleep(3000);
            continue;
          }
          if (status === 404 || status === 403) {
            // Model not offered to this key: skip it for the rest of the process lifetime.
            unavailableUntil.set(modelName, Number.MAX_SAFE_INTEGER);
            break;
          }
          if (status === 400) break; // request rejected by this model: try the next one
          throw err;
        }
      }
    }
    if (dailyCapped >= this.models.length) {
      const err = new Error(
        'AI daily quota reached for every configured Gemini model (free tier). Retry after the daily reset, or enable billing on the Google AI project.',
      );
      err.transient = false;
      err.quotaExhausted = true;
      throw err;
    }
    const err = lastErr || new Error('Gemini request failed');
    // Rate limits and overload are temporary: callers may retry the whole job later.
    const status = statusOf(err);
    err.transient = status === 429 || status >= 500;
    throw err;
  }

  async analyzeImage({ image, imageUrl, filename, context = {} }) {
    const part = await toInlinePart(image || imageUrl);
    const categories = (context.categories || []).join(', ');
    const prompt = `${TRUST_RULES}
Analyze this ${image?.kind === 'video' ? 'video clip (consider the whole clip, not one frame)' : 'photo'} submitted as evidence for the project "${context.projectName || 'unknown'}"${context.projectCategory ? ` (${context.projectCategory})` : ''}${context.projectLocation ? ` in ${context.projectLocation}` : ''}.
${categories ? `When an activity matches one of these project evidence categories, use that exact name: ${categories}.` : ''}
Also detect environmental signals such as vegetation, water, waste, soil, erosion, air, built infrastructure.
Keep every name short (1-3 lowercase words, e.g. "vegetation", "plastic waste", "saplings"); put details in the description, never in parentheses.
Tags should be short lowercase keywords useful for search. If this is not field evidence, set isFieldEvidence=false, leave activities empty and say so in the summary.
File name (may be meaningless): ${filename || 'n/a'}`;
    const r = await this.generate([{ text: prompt }, part], ANALYSIS_SCHEMA, { think: false });
    const activities = scores(r.activities, 6);
    return {
      description: String(r.description || '').slice(0, 600),
      tags: [...new Set(strings(r.tags, 12).map((t) => t.toLowerCase()))],
      objects: scores(r.objects, 12),
      activities: r.isFieldEvidence === false ? [] : activities,
      environmentalSignals: scores(r.environmentalSignals, 8),
      aiSummary: String(r.aiSummary || '').slice(0, 400),
      aiConfidence: clamp01(r.aiConfidence),
      observedInferred: { observed: strings(r.observed, 8), inferred: strings(r.inferred, 8) },
      estimatedPlace: String(r.estimatedPlace || '').trim(),
      isFieldEvidence: r.isFieldEvidence !== false,
      model: this.lastModel,
      analyzedAt: new Date(),
    };
  }

  async compareImages({ before, after, beforeUrl, afterUrl }) {
    const [b, a] = await Promise.all([
      toInlinePart(before || beforeUrl),
      toInlinePart(after || afterUrl),
    ]);
    const prompt = `${TRUST_RULES}
The first image is a BEFORE capture and the second is an AFTER capture from the same project.
Describe the visible differences (vegetation, waste, water, structures, people). visualChangeScore reflects how much the visible scene changed, not whether the change is good.
If they do not show the same place, set sameScene=false and say so in observedChanges.`;
    const r = await this.generate(
      [{ text: prompt }, { text: 'BEFORE:' }, b, { text: 'AFTER:' }, a],
      COMPARE_SCHEMA,
    );
    return {
      sameScene: r.sameScene !== false,
      visualChangeScore: clamp01(r.visualChangeScore),
      observedChanges: strings(r.observedChanges, 8),
      inferredNotes: strings(r.inferredNotes, 6),
      confidence: clamp01(r.confidence),
      model: this.lastModel,
    };
  }

  async generateSummary({ project, evidence }) {
    const prompt = `${TRUST_RULES}
Write a warm, factual impact story (120-180 words, plain text, no markdown) for the project below, grounded ONLY in this evidence summary. Mention that observations come from AI analysis of field media and should be verified.
Project: ${JSON.stringify({ name: project.name, organization: project.organization, description: project.description, location: project.location?.name, goals: project.goals })}
Evidence: ${JSON.stringify(evidence || {})}`;
    const r = await this.generate(
      [{ text: prompt }],
      { type: T.OBJECT, properties: { story: { type: T.STRING } }, required: ['story'] },
      { temperature: 0.6 },
    );
    return String(r.story || '').trim();
  }

  async generateCampaign({ project, evidence }) {
    const prompt = `${TRUST_RULES}
Create campaign copy for the project below, grounded ONLY in this evidence summary:
- socialCaption: under 240 characters, 1-2 relevant hashtags.
- websiteStory: 2 short paragraphs.
- executiveSummary: 3 sentences for funders, with the evidence counts.
- presentationSummary: 3 bullet-like sentences separated by newlines.
Project: ${JSON.stringify({ name: project.name, organization: project.organization, description: project.description, location: project.location?.name, goals: project.goals })}
Evidence: ${JSON.stringify(evidence || {})}`;
    const r = await this.generate([{ text: prompt }], CAMPAIGN_SCHEMA, { temperature: 0.6 });
    return {
      socialCaption: String(r.socialCaption || '').trim(),
      websiteStory: String(r.websiteStory || '').trim(),
      executiveSummary: String(r.executiveSummary || '').trim(),
      presentationSummary: String(r.presentationSummary || '').trim(),
    };
  }

  get modelName() {
    return this.lastModel;
  }
}
module.exports = GeminiProvider;
