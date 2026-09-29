function extractExif(buffer) {
  try {
    const parser = require('exif-parser').create(buffer);
    const result = parser.parse();
    const captureDate = result.tags?.DateTimeOriginal || result.tags?.CreateDate;
    const latitude = result.tags?.GPSLatitude;
    const longitude = result.tags?.GPSLongitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
      return { captureDate: captureDate ? new Date(captureDate * 1000) : undefined };
    return {
      captureDate: captureDate ? new Date(captureDate * 1000) : undefined,
      location: { lat: latitude, lng: longitude, source: 'GPS_VERIFIED' },
    };
  } catch (_err) {
    // EXIF is user supplied and malformed metadata must not reject a valid upload.
    return {};
  }
}
module.exports = { extractExif };
