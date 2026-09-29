const cloudinary = require('../../config/cloudinary');
const { config } = require('../../config/env');

/** Smart-cropped (g_auto) card thumbnail; videos get an automatically chosen poster frame. */
exports.thumbnail = (publicId, resourceType = 'image') =>
  cloudinary.url(publicId, {
    resource_type: resourceType,
    width: 480,
    height: 320,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
    ...(resourceType === 'video' ? { format: 'jpg', start_offset: 'auto' } : {}),
    secure: true,
  });
exports.responsive = (publicId, width = 800) =>
  cloudinary.url(publicId, {
    width,
    crop: 'limit',
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
  });
/** JPEG frames sampled across a video (10%, 50%, 90%) for AI analysis. */
exports.videoFrames = (publicId) =>
  ['10p', '50p', '90p'].map((so) =>
    cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      start_offset: so,
      width: 1280,
      crop: 'limit',
      secure: true,
    }),
  );
/** Side-by-side before|after composite rendered by Cloudinary (used in reports and shares). */
exports.comparisonComposite = (beforeId, afterId) =>
  cloudinary.url(beforeId, {
    secure: true,
    transformation: [
      { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
      { width: 1600, height: 600, crop: 'pad', gravity: 'west', background: 'white' },
      {
        overlay: afterId.replace(/\//g, ':'),
        width: 800,
        height: 600,
        crop: 'fill',
        gravity: 'auto',
      },
      { flags: 'layer_apply', gravity: 'east' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
const isCloudinaryAsset = (asset) =>
  Boolean(
    asset?.cloudinaryPublicId &&
    asset.storage !== 'local' &&
    asset.storage !== 'external' &&
    config.cloudinary.cloudName &&
    config.cloudinary.mode !== 'mock' &&
    String(asset.secureUrl || '').includes(`res.cloudinary.com/${config.cloudinary.cloudName}/`),
  );
exports.isCloudinaryAsset = isCloudinaryAsset;
/** Delivery URLs for the browser: Cloudinary transforms for real assets, the stored URL otherwise. */
exports.deliveryUrls = (asset) => {
  if (!asset) return {};
  if (isCloudinaryAsset(asset))
    return {
      thumbnailUrl: exports.thumbnail(asset.cloudinaryPublicId, asset.resourceType),
      previewUrl:
        asset.resourceType === 'video'
          ? asset.secureUrl
          : exports.responsive(asset.cloudinaryPublicId, 1600),
    };
  // Local videos have no poster frame without Cloudinary; the client shows its placeholder instead.
  if (asset.resourceType === 'video')
    return { thumbnailUrl: undefined, previewUrl: asset.secureUrl };
  return { thumbnailUrl: asset.secureUrl, previewUrl: asset.secureUrl };
};
