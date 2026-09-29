const fs = require('fs/promises');
const cloudinary = require('../../config/cloudinary');
const { localPathFor } = require('../cloudinary/upload.service');
const { isCloudinaryAsset, responsive, videoFrames } = require('../cloudinary/transform.service');
const ApiError = require('../../utils/ApiError');

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};
// Gemini accepts inline media up to ~20 MB per request; leave headroom for the prompt.
const MAX_INLINE_VIDEO_BYTES = 18 * 1024 * 1024;

/**
 * What the AI provider should look at for an asset:
 * - local files are read from disk (images and short videos are sent inline),
 * - Cloudinary images use a 1600px derivative; videos a 640px MP4 transcode (Gemini watches the
 *   clip), with a mid-point frame as fallback,
 * - external (open-licence) images use their stored URL.
 */
async function imageInputFor(asset) {
  const local = localPathFor(asset.cloudinaryPublicId);
  if (asset.resourceType === 'video') {
    if (local) {
      const { size } = await fs.stat(local);
      if (size > MAX_INLINE_VIDEO_BYTES)
        throw new ApiError(
          422,
          'VIDEO_TOO_LARGE',
          'Videos over 18 MB can only be analyzed when Cloudinary is configured (it provides a compressed copy).',
        );
      const ext = local.split('.').pop().toLowerCase();
      return { data: await fs.readFile(local), mimeType: MIME[ext] || 'video/mp4', kind: 'video' };
    }
    if (isCloudinaryAsset(asset))
      return {
        url: cloudinary.url(asset.cloudinaryPublicId, {
          resource_type: 'video',
          format: 'mp4',
          width: 640,
          crop: 'limit',
          quality: 'auto:low',
          secure: true,
        }),
        fallbackUrl: videoFrames(asset.cloudinaryPublicId)[1],
        kind: 'video',
      };
    throw new ApiError(
      422,
      'VIDEO_UNAVAILABLE',
      'The video file could not be located for analysis.',
    );
  }
  if (local) {
    const ext = local.split('.').pop().toLowerCase();
    return { data: await fs.readFile(local), mimeType: MIME[ext] || 'image/jpeg', kind: 'image' };
  }
  if (isCloudinaryAsset(asset))
    return { url: responsive(asset.cloudinaryPublicId, 1600), kind: 'image' };
  return { url: asset.secureUrl, kind: 'image' };
}

module.exports = { imageInputFor, MAX_INLINE_VIDEO_BYTES };
