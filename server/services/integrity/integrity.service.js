const Media = require('../../models/MediaAsset');
const Project = require('../../models/Project');
const { hamming } = require('./fingerprint');

/**
 * Evidence integrity ("anti-greenwashing") checks. Flags are signals for human review, not verdicts:
 * a flagged photo may be perfectly legitimate, but a reviewer should look at it before it's reported.
 */
const SEVERITY_PENALTY = { high: 40, medium: 20, low: 8 };
const NEAR_DUPLICATE_BITS = 6; // of 64: resized/recompressed copies of the same frame
const DATE_GRACE_DAYS = 30;
const EDITING_SOFTWARE =
  /photoshop|lightroom|gimp|snapseed|picsart|canva|facetune|pixlr|affinity|photoscape|remini|meitu|airbrush/i;

const toRad = (d) => (d * Math.PI) / 180;
function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const hasCoords = (l) => Number.isFinite(l?.lat) && Number.isFinite(l?.lng);
const label = (a) => a.originalFilename || String(a._id);

/** Evaluates one asset against its project and the wider collection (for cross-project reuse). */
function checkAsset(a, project, others, projectNames) {
  const flags = [];
  const add = (code, severity, message, related) =>
    flags.push({ code, severity, message, ...(related ? { relatedMediaId: related } : {}) });

  if (a.fingerprint?.sha256) {
    const same = others.find((o) => o.fingerprint?.sha256 === a.fingerprint.sha256);
    if (same)
      add(
        'DUPLICATE_EXACT',
        'high',
        String(same.projectId) === String(a.projectId)
          ? `Identical file to “${label(same)}” in this project.`
          : `Identical file is also used in project “${projectNames[String(same.projectId)] || 'another project'}”.`,
        same._id,
      );
  }
  if (a.fingerprint?.dhash && !flags.some((f) => f.code === 'DUPLICATE_EXACT')) {
    const near = others.find(
      (o) =>
        o.fingerprint?.dhash &&
        hamming(o.fingerprint.dhash, a.fingerprint.dhash) <= NEAR_DUPLICATE_BITS,
    );
    if (near)
      add(
        'NEAR_DUPLICATE',
        'medium',
        String(near.projectId) === String(a.projectId)
          ? `Visually near-identical to “${label(near)}”: possibly a resized or re-edited copy.`
          : `Visually near-identical to a photo in project “${projectNames[String(near.projectId)] || 'another project'}”.`,
        near._id,
      );
  }
  if (a.resourceType === 'image' && a.camera && a.camera.hasExif === false)
    add(
      'NO_CAMERA_METADATA',
      'low',
      'No camera metadata: may be a screenshot, download or re-saved copy.',
    );
  if (a.camera?.software && EDITING_SOFTWARE.test(a.camera.software))
    add('EDITED', 'medium', `Saved by editing software (${a.camera.software}).`);

  const captured = a.captureDate ? new Date(a.captureDate) : null;
  if (captured && captured.getTime() > Date.now() + 86400000)
    add('FUTURE_DATE', 'high', 'Capture date is in the future.');
  else if (captured && project) {
    const grace = DATE_GRACE_DAYS * 86400000;
    if (project.startDate && captured < new Date(new Date(project.startDate).getTime() - grace))
      add('BEFORE_PROJECT', 'medium', 'Captured before the project started.');
    if (project.endDate && captured > new Date(new Date(project.endDate).getTime() + grace))
      add('AFTER_PROJECT', 'low', 'Captured after the project’s end date.');
  }
  if (!captured) add('NO_CAPTURE_DATE', 'low', 'No capture date: timeline position is unverified.');

  if (project?.siteRadiusKm && hasCoords(project.location) && hasCoords(a.location)) {
    const km = distanceKm(project.location, a.location);
    if (km > project.siteRadiusKm)
      add(
        'FAR_FROM_SITE',
        km > project.siteRadiusKm * 4 ? 'medium' : 'low',
        `Located ${Math.round(km)} km from the project site (radius ${project.siteRadiusKm} km).`,
      );
  }
  if (!a.location?.source || a.location.source === 'UNKNOWN')
    add('NO_LOCATION', 'low', 'No location attached.');
  else if (a.location.source === 'AI_ESTIMATED')
    add('LOCATION_AI_ONLY', 'low', 'Location is only an AI estimate.');
  if ((a.tags || []).includes('not-field-evidence'))
    add(
      'NOT_FIELD_EVIDENCE',
      'medium',
      'AI judged this is not field evidence (e.g. a sign, document or screenshot).',
    );

  const score = Math.max(0, 100 - flags.reduce((s, f) => s + SEVERITY_PENALTY[f.severity], 0));
  return { score, flags };
}

const FIELDS =
  'projectId originalFilename resourceType fingerprint camera captureDate location tags processingStatus';

/** Integrity for every asset in a project, returned as a Map keyed by media id plus a summary. */
async function projectIntegrity(projectId) {
  const project = await Project.findById(projectId).lean();
  const assets = await Media.find({ projectId }).select(FIELDS).lean();
  const hashes = assets.map((a) => a.fingerprint?.sha256).filter(Boolean);
  // Candidates from the whole collection: exact matches by index, plus all perceptual hashes
  // (cheap at demo scale; swap for an LSH index beyond ~100k assets).
  const [exact, perceptual, projects] = await Promise.all([
    Media.find({ 'fingerprint.sha256': { $in: hashes } })
      .select('projectId originalFilename fingerprint')
      .lean(),
    Media.find({ 'fingerprint.dhash': { $exists: true } })
      .select('projectId originalFilename fingerprint')
      .lean(),
    Project.find().select('name').lean(),
  ]);
  const projectNames = Object.fromEntries(projects.map((p) => [String(p._id), p.name]));
  const pool = [...new Map([...exact, ...perceptual].map((o) => [String(o._id), o])).values()];
  const byId = new Map();
  const byFlag = {};
  for (const a of assets) {
    const others = pool.filter((o) => String(o._id) !== String(a._id));
    const r = checkAsset(a, project, others, projectNames);
    byId.set(String(a._id), r);
    r.flags.forEach((f) => (byFlag[f.code] = (byFlag[f.code] || 0) + 1));
  }
  const scores = [...byId.values()].map((r) => r.score);
  const reviewNeeded = [...byId.values()].filter((r) =>
    r.flags.some((f) => f.severity !== 'low'),
  ).length;
  return {
    byId,
    summary: {
      score: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null,
      assetsChecked: assets.length,
      clean: [...byId.values()].filter((r) => !r.flags.length).length,
      reviewNeeded,
      byFlag,
      siteRadiusKm: project?.siteRadiusKm ?? null,
      checkedAt: new Date(),
    },
  };
}

module.exports = { projectIntegrity, checkAsset, distanceKm, SEVERITY_PENALTY };
