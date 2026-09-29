const MediaAsset = require('../models/MediaAsset');
const Project = require('../models/Project');
const { createProvider } = require('../services/ai/providerFactory');
const { imageInputFor } = require('../services/media/imageInput');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [30_000, 60_000, 120_000];

async function analyzeMedia(id) {
  const asset = await MediaAsset.findById(id);
  if (!asset) return;
  asset.processingStatus = 'PROCESSING';
  asset.attempts += 1;
  asset.processingError = undefined;
  await asset.save();
  try {
    const provider = createProvider();
    const project = await Project.findById(asset.projectId)
      .select('name category location expectedEvidenceCategories')
      .lean();
    const data = await provider.analyzeImage({
      image: await imageInputFor(asset),
      imageUrl: asset.secureUrl,
      filename: asset.originalFilename,
      context: {
        projectId: asset.projectId,
        projectName: project?.name,
        projectCategory: project?.category,
        projectLocation: project?.location?.name,
        categories: project?.expectedEvidenceCategories,
      },
    });
    const tags = data.tags || [];
    if (data.isFieldEvidence === false && !tags.includes('not-field-evidence'))
      tags.push('not-field-evidence');
    Object.assign(asset, {
      tags,
      objects: data.objects || [],
      activities: data.activities || [],
      environmentalSignals: data.environmentalSignals || [],
      aiDescription: data.description || '',
      aiSummary: data.aiSummary || '',
      aiConfidence: data.aiConfidence || 0,
      observedInferred: data.observedInferred || { observed: [], inferred: [] },
      processingStatus: 'COMPLETED',
      analysis: {
        provider: provider.constructor.name,
        model: data.model || 'mock',
        version: 'prompt-v2',
        analyzedAt: new Date(),
      },
    });
    // A place the model read from signage/landmarks is only ever recorded as AI_ESTIMATED,
    // and never overrides GPS or user-provided locations.
    if (data.estimatedPlace && (!asset.location?.source || asset.location.source === 'UNKNOWN'))
      asset.location = { name: data.estimatedPlace.slice(0, 120), source: 'AI_ESTIMATED' };
    await asset.save();
    // Semantic-search vector for the fresh analysis (non-fatal: keyword search still works).
    await require('../services/ai/embeddings').embedAssets([asset.toObject()]);
  } catch (err) {
    // Provider overload / rate limits: re-queue with growing delays instead of failing the asset.
    if (err.transient && asset.attempts < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS_MS[Math.min(asset.attempts - 1, RETRY_DELAYS_MS.length - 1)];
      logger.warn(
        { assetId: String(asset._id), delay, err: err.message },
        'AI busy; retrying later',
      );
      asset.processingStatus = 'PENDING';
      asset.processingError = `AI service busy; retrying automatically (attempt ${asset.attempts + 1} of ${MAX_ATTEMPTS}).`;
      await asset.save();
      setTimeout(() => require('./queue').enqueue(asset._id), delay).unref?.();
      return;
    }
    logger.warn({ assetId: String(asset._id), err: err.message }, 'Media analysis failed');
    asset.processingStatus = 'FAILED';
    // Some codecs (e.g. WebM with Vorbis audio) are rejected by the model; say so plainly.
    const codecIssue =
      asset.resourceType === 'video' && /\[400|invalid argument/i.test(err.message);
    asset.processingError = codecIssue
      ? 'The AI model could not read this video’s format. Upload it as MP4 (H.264) or MOV, or configure Cloudinary to convert it automatically.'
      : String(err.message).slice(0, 300);
    await asset.save();
  }
}
module.exports = { analyzeMedia };
