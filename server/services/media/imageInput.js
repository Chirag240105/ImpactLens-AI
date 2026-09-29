const fs = require('fs/promises');
const { localPathFor } = require('../cloudinary/upload.service');
const { isCloudinaryAsset, responsive, videoFrames } = require('../cloudinary/transform.service');
const ApiError = require('../../utils/ApiError');

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * What the AI provider should look at for an asset:
 * - local images are read from disk (no URL round trip),
 * - Cloudinary images use a 1600px derivative, videos a mid-point frame,
 * - external (open-licence) images use their stored URL.
 */
async function imageInputFor(asset) {
  const local = localPathFor(asset.cloudinaryPublicId);
  if (asset.resourceType === 'video') {
    if (isCloudinaryAsset(asset)) return { url: videoFrames(asset.cloudinaryPublicId)[1] };
    throw new ApiError(
      422,
      'VIDEO_NEEDS_CLOUDINARY',
      'Video frames can only be extracted when Cloudinary is configured. The video is stored and can be re-analyzed later.',
    );
  }
  if (local) {
    const ext = local.split('.').pop().toLowerCase();
    return { data: await fs.readFile(local), mimeType: MIME[ext] || 'image/jpeg' };
  }
  if (isCloudinaryAsset(asset)) return { url: responsive(asset.cloudinaryPublicId, 1600) };
  return { url: asset.secureUrl };
}

module.exports = { imageInputFor };
