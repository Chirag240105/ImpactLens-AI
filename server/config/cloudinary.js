const cloudinary = require('cloudinary').v2;
const { config } = require('./env');
const { cloudName, apiKey, apiSecret } = config.cloudinary;

// Keep configuration values mapped from env.js's normalized camelCase keys.
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

module.exports = cloudinary;
