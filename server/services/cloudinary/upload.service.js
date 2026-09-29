const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../../config/cloudinary');
const { config } = require('../../config/env');
const ApiError = require('../../utils/ApiError');

const EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const hasCredentials = () => {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return config.cloudinary.mode !== 'mock' && Boolean(cloudName && apiKey && apiSecret);
};
// Result of the startup credential check: 'configured' | 'misconfigured' | 'demo-mode' | null (unchecked).
let cloudinaryStatus = null;

/** Pings Cloudinary once at startup so bad credentials degrade to local storage instead of failing uploads. */
async function verifyCloudinary() {
  if (!hasCredentials()) return (cloudinaryStatus = 'demo-mode');
  try {
    await cloudinary.api.ping();
    cloudinaryStatus = 'configured';
  } catch (error) {
    cloudinaryStatus = 'misconfigured';
    const message = error?.error?.message || error.message;
    require('../../utils/logger').warn(
      { reason: message },
      'Cloudinary credentials were rejected; storing media locally. Check CLOUDINARY_CLOUD_NAME (the "Cloud name" on your Cloudinary dashboard).',
    );
  }
  return cloudinaryStatus;
}
const getCloudinaryStatus = () =>
  cloudinaryStatus || (hasCredentials() ? 'configured' : 'demo-mode');
const cloudinaryReady = () => hasCredentials() && cloudinaryStatus !== 'misconfigured';

/**
 * Local-disk fallback used when Cloudinary isn't configured (or CLOUDINARY_MODE=mock): files are
 * real and served from /api/uploads, so uploads and AI analysis work end to end offline.
 */
async function saveLocal(buffer, { mime, folder }) {
  const ext = EXT[mime] || 'bin';
  const rel = path.posix.join(folder || 'misc', `${crypto.randomUUID()}.${ext}`);
  const abs = path.join(config.uploadsDir, ...rel.split('/'));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
  return {
    public_id: `local/${rel}`,
    secure_url: `${config.publicApiUrl}/api/uploads/${rel}`,
    resource_type: mime.startsWith('video/') ? 'video' : 'image',
    format: ext,
    bytes: buffer.length,
    storage: 'local',
  };
}

async function uploadBuffer(buffer, { mime, folder } = {}) {
  if (!cloudinaryReady()) return saveLocal(buffer, { mime, folder });
  try {
    const up = await cloudinary.uploader.upload(
      `data:${mime};base64,${buffer.toString('base64')}`,
      {
        folder,
        resource_type: 'auto',
        // EXIF (capture date, GPS) and a perceptual hash for duplicate detection.
        image_metadata: true,
        phash: true,
        unique_filename: true,
      },
    );
    return { ...up, storage: 'cloudinary' };
  } catch (error) {
    const message = error?.error?.message || error.message || 'Cloudinary upload failed';
    if (/cloud_name/i.test(message))
      throw new ApiError(
        502,
        'CLOUDINARY_INVALID_CLOUD_NAME',
        `Cloudinary rejected CLOUDINARY_CLOUD_NAME. Copy the "Cloud name" from your Cloudinary Console dashboard: ${message}`,
      );
    throw new ApiError(502, 'CLOUDINARY_UPLOAD_FAILED', message);
  }
}

/** Absolute path of a locally stored asset, or null for anything else. */
function localPathFor(publicId) {
  if (!publicId || !publicId.startsWith('local/')) return null;
  const abs = path.resolve(config.uploadsDir, ...publicId.slice('local/'.length).split('/'));
  return abs.startsWith(path.resolve(config.uploadsDir)) ? abs : null;
}

async function destroy(publicId, resourceType = 'image') {
  const local = localPathFor(publicId);
  if (local) return fs.rm(local, { force: true });
  if (
    cloudinaryReady() &&
    publicId &&
    !publicId.startsWith('demo/') &&
    !publicId.startsWith('commons/')
  )
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = {
  uploadBuffer,
  destroy,
  localPathFor,
  cloudinaryReady,
  verifyCloudinary,
  getCloudinaryStatus,
};
