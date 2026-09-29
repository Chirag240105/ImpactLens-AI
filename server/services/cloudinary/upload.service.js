const cloudinary = require('../../config/cloudinary');
const { config } = require('../../config/env');
const ApiError = require('../../utils/ApiError');

function cloudinaryReady() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  return Boolean(cloudName && apiKey && apiSecret);
}

async function uploadBuffer(buffer, options) {
  if (config.cloudinary.mode === 'mock' || !cloudinaryReady()) {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    const hasPartialCredentials = Boolean(cloudName || apiKey || apiSecret);
    if (config.cloudinary.mode !== 'mock' && hasPartialCredentials)
      throw new ApiError(
        503,
        'CLOUDINARY_NOT_CONFIGURED',
        'Cloudinary credentials are incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET, or set CLOUDINARY_MODE=mock for local testing.',
      );
    return {
      public_id: `demo/${Date.now()}`,
      secure_url: `https://res.cloudinary.com/demo/image/upload/placeholder.jpg`,
      resource_type: options.resource_type || 'image',
    };
  }
  try {
    return await cloudinary.uploader.upload(
      `data:${options.mime};base64,${buffer.toString('base64')}`,
      {
        folder: options.folder,
        resource_type: 'auto',
        image_metadata: true,
        ...options,
      },
    );
  } catch (error) {
    const message = error?.error?.message || error.message || 'Cloudinary upload failed';
    if (/invalid cloud_name/i.test(message))
      throw new ApiError(
        502,
        'CLOUDINARY_INVALID_CLOUD_NAME',
        `Cloudinary rejected CLOUDINARY_CLOUD_NAME. Copy the Cloud name from your Cloudinary Console: ${message}`,
      );
    throw new ApiError(502, 'CLOUDINARY_UPLOAD_FAILED', message);
  }
}
async function destroy(publicId, resourceType = 'image') {
  if (config.cloudinary.mode !== 'mock' && cloudinaryReady() && publicId)
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
module.exports = { uploadBuffer, destroy };
