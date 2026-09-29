const MediaAsset = require('../models/MediaAsset');
const { createProvider } = require('../services/ai/providerFactory');
async function analyzeMedia(id) {
  const asset = await MediaAsset.findById(id);
  if (!asset) return;
  asset.processingStatus = 'PROCESSING';
  asset.attempts += 1;
  asset.processingError = undefined;
  await asset.save();
  try {
    const provider = createProvider();
    const data = await provider.analyzeImage({
      imageUrl: asset.secureUrl,
      filename: asset.originalFilename,
      context: { projectId: asset.projectId },
    });
    Object.assign(asset, {
      tags: data.tags || [],
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
        version: 'prompt-v1',
        analyzedAt: new Date(),
      },
    });
    await asset.save();
  } catch (err) {
    asset.processingStatus = 'FAILED';
    asset.processingError = String(err.message).slice(0, 300);
    await asset.save();
  }
}
module.exports = { analyzeMedia };
