const crypto = require('crypto');

/**
 * Content fingerprints for duplicate detection:
 * - sha256: exact byte-level duplicates (the same file uploaded twice),
 * - dhash: 64-bit difference hash that survives resizing, recompression and small edits.
 */
async function fingerprint(buffer, { isImage = true } = {}) {
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (!isImage) return { sha256 };
  try {
    const sharp = require('sharp');
    const px = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .grayscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer();
    let bits = '';
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0';
    const dhash = BigInt(`0b${bits}`).toString(16).padStart(16, '0');
    return { sha256, dhash };
  } catch (_err) {
    return { sha256 }; // undecodable image: exact-duplicate check still works
  }
}

/** Number of differing bits between two 64-bit hex hashes (0 = visually identical). */
function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return 64;
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

module.exports = { fingerprint, hamming };
