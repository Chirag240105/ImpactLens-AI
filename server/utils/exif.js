/**
 * Reads capture date, GPS and camera details from JPEG EXIF. Works on a partial buffer (EXIF sits
 * at the start of the file). Never throws: malformed metadata must not reject a valid upload.
 */
function extractExif(buffer) {
  try {
    const parser = require('exif-parser').create(buffer);
    parser.enableSimpleValues(true);
    const result = parser.parse();
    const t = result.tags || {};
    const captureDate = t.DateTimeOriginal || t.CreateDate;
    const camera = {
      hasExif: Object.keys(t).length > 0,
      make: t.Make ? String(t.Make).trim().slice(0, 60) : undefined,
      model: t.Model ? String(t.Model).trim().slice(0, 60) : undefined,
      software: t.Software ? String(t.Software).trim().slice(0, 80) : undefined,
    };
    const out = { captureDate: captureDate ? new Date(captureDate * 1000) : undefined, camera };
    if (Number.isFinite(t.GPSLatitude) && Number.isFinite(t.GPSLongitude))
      out.location = { lat: t.GPSLatitude, lng: t.GPSLongitude, source: 'GPS_VERIFIED' };
    return out;
  } catch (_err) {
    return { camera: { hasExif: false } };
  }
}
module.exports = { extractExif };
