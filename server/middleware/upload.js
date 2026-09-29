const multer = require('multer');
const { config } = require('../config/env');
const ApiError = require('../utils/ApiError');
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (/^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/.test(file.mimetype))
      return cb(null, true);
    cb(new ApiError(400, 'INVALID_FILE', 'Only supported image and video formats can be uploaded'));
  },
});
function magic(req, res, next) {
  for (const f of req.files || []) {
    const b = f.buffer;
    const image =
      (b[0] === 0xff && b[1] === 0xd8) ||
      (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') ||
      ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6)) ||
      (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP');
    const video =
      b.toString('ascii', 4, 8) === 'ftyp' ||
      (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3);
    if (!(image || video))
      return next(
        new ApiError(400, 'INVALID_FILE', 'File content does not match supported media types'),
      );
  }
  next();
}
module.exports = { parse: parser.array('files', 20), magic };
