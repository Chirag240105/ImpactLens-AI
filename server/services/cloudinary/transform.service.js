const cloudinary = require('../../config/cloudinary');
exports.thumbnail = (publicId) =>
  cloudinary.url(publicId, {
    width: 480,
    height: 320,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
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
