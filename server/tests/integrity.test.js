const { checkAsset, distanceKm } = require('../services/integrity/integrity.service');
const { fingerprint, hamming } = require('../services/integrity/fingerprint');

const project = {
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-06-30'),
  location: { lat: 28.5355, lng: 77.391 },
  siteRadiusKm: 50,
};
const base = {
  _id: 'a1',
  projectId: 'p1',
  resourceType: 'image',
  captureDate: new Date('2026-03-01'),
  location: { lat: 28.54, lng: 77.39, source: 'GPS_VERIFIED' },
  camera: { hasExif: true, make: 'Canon' },
  fingerprint: { sha256: 'aaa', dhash: '0f0f0f0f0f0f0f0f' },
};
const codes = (r) => r.flags.map((f) => f.code);

describe('integrity checks', () => {
  test('a clean, in-window, on-site GPS photo scores 100', () => {
    const r = checkAsset(base, project, [], {});
    expect(r).toEqual({ score: 100, flags: [] });
  });
  test('reuse in another project is a high-severity exact duplicate', () => {
    const other = {
      _id: 'b1',
      projectId: 'p2',
      originalFilename: 'x.jpg',
      fingerprint: { sha256: 'aaa' },
    };
    const r = checkAsset(base, project, [other], { p2: 'Other NGO drive' });
    expect(codes(r)).toEqual(['DUPLICATE_EXACT']);
    expect(r.flags[0].message).toMatch(/Other NGO drive/);
    expect(r.score).toBe(60);
  });
  test('perceptual near-duplicates are caught when bytes differ', () => {
    const other = {
      _id: 'b2',
      projectId: 'p1',
      fingerprint: { sha256: 'bbb', dhash: '0f0f0f0f0f0f0f0e' },
    };
    expect(codes(checkAsset(base, project, [other], {}))).toEqual(['NEAR_DUPLICATE']);
  });
  test('dates, editing, distance and missing metadata are flagged', () => {
    const r = checkAsset(
      {
        ...base,
        captureDate: new Date('2025-06-01'),
        camera: { hasExif: true, software: 'Adobe Photoshop 25.0' },
        location: { lat: 27.49, lng: 77.67, source: 'USER_PROVIDED' }, // Mathura, ~130 km away
      },
      project,
      [],
      {},
    );
    expect(codes(r).sort()).toEqual(['BEFORE_PROJECT', 'EDITED', 'FAR_FROM_SITE'].sort());
    expect(
      codes(
        checkAsset(
          { ...base, camera: { hasExif: false }, location: { source: 'UNKNOWN' } },
          project,
          [],
          {},
        ),
      ),
    ).toEqual(expect.arrayContaining(['NO_CAMERA_METADATA', 'NO_LOCATION']));
    expect(
      codes(
        checkAsset({ ...base, captureDate: new Date(Date.now() + 5 * 86400000) }, project, [], {}),
      ),
    ).toContain('FUTURE_DATE');
  });
  test('multi-site projects skip the distance check', () => {
    const far = { ...base, location: { lat: 22.57, lng: 88.36, source: 'USER_PROVIDED' } };
    expect(codes(checkAsset(far, { ...project, siteRadiusKm: null }, [], {}))).toEqual([]);
  });
  test('distance and hashing helpers', async () => {
    expect(
      Math.round(distanceKm({ lat: 28.61, lng: 77.21 }, { lat: 19.08, lng: 72.88 })),
    ).toBeGreaterThan(1100);
    const sharp = require('sharp');
    const img = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#4a7' } })
      .composite([
        {
          input: Buffer.from(
            '<svg width="32" height="48"><rect width="32" height="48" fill="#123"/></svg>',
          ),
          left: 0,
          top: 0,
        },
      ])
      .jpeg()
      .toBuffer();
    const resized = await sharp(img).resize(128, 96).jpeg({ quality: 60 }).toBuffer();
    const [a, b] = await Promise.all([fingerprint(img), fingerprint(resized)]);
    expect(a.sha256).not.toBe(b.sha256);
    expect(hamming(a.dhash, b.dhash)).toBeLessThanOrEqual(6);
  });
});

describe('SDG alignment', () => {
  const { assetSdgs } = require('../services/sdg/sdg.service');
  const goals = (a) => assetSdgs(a).map((g) => g.goal);
  test('tree planting by women aligns with life on land, climate and gender goals', () => {
    const a = {
      activities: [{ name: 'Plantation', confidence: 0.9 }],
      objects: [
        { name: 'saplings', confidence: 0.9 },
        { name: 'women', confidence: 0.8 },
      ],
      tags: [],
    };
    expect(goals(a)).toEqual(expect.arrayContaining([5, 13, 15]));
    expect(assetSdgs(a).find((g) => g.goal === 15).matched).toEqual(
      expect.arrayContaining(['plantation', 'saplings']),
    );
  });
  test('polluted river evidence aligns with water goals; low-confidence and non-field items do not', () => {
    const river = {
      environmentalSignals: [
        { name: 'water', confidence: 0.9 },
        { name: 'plastic waste', confidence: 0.8 },
      ],
      tags: [],
    };
    expect(goals(river)).toEqual(expect.arrayContaining([6, 12, 14]));
    expect(goals({ activities: [{ name: 'Plantation', confidence: 0.3 }], tags: [] })).toEqual([]);
    expect(
      goals({
        activities: [{ name: 'Plantation', confidence: 0.9 }],
        tags: ['not-field-evidence'],
      }),
    ).toEqual([]);
  });
});
