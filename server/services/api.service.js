const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Project = require('../models/Project');
const Media = require('../models/MediaAsset');
const Analysis = require('../models/Analysis');
const Insight = require('../models/Insight');
const Report = require('../models/Report');
const { config } = require('../config/env');
const ApiError = require('../utils/ApiError');
const pageOf = require('../utils/pagination');
const { createProvider } = require('./ai/providerFactory');
const cloud = require('./cloudinary/upload.service');
const { projectFolder } = require('./cloudinary/folders');
const { enqueue } = require('../jobs/queue');
const {
  deliveryUrls,
  isCloudinaryAsset,
  comparisonComposite,
} = require('./cloudinary/transform.service');
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const withUrls = (a) => (a ? { ...a, ...deliveryUrls(a) } : a);
// List DTO: secureUrl stays internal; the browser gets delivery URLs instead.
const listItem = (a) => {
  const out = withUrls(a);
  delete out.secureUrl;
  return out;
};
const lean = (a) => (a && typeof a.toObject === 'function' ? a.toObject() : a);
// Compact card DTO for lists that reference media (pairs, comparisons, timeline highlights).
const mediaCard = (a) =>
  a && {
    _id: a._id,
    ...deliveryUrls(a),
    resourceType: a.resourceType,
    originalFilename: a.originalFilename,
    captureDate: a.captureDate,
    evidenceType: a.evidenceType,
    location: a.location,
    activities: a.activities,
    aiConfidence: a.aiConfidence,
  };
const SEARCH_STOPWORDS = new Set(
  'a an and any all are at by evidence find for from get in is me of on or photos images media pictures please show some that the this to where which with'.split(
    ' ',
  ),
);
const SEARCH_FIELDS = [
  'tags',
  'aiDescription',
  'aiSummary',
  'originalFilename',
  'activities.name',
  'objects.name',
  'environmentalSignals.name',
  'location.name',
];
const allowed = (p, u) =>
  u.role === 'ADMIN' || String(p.createdBy) === String(u._id) || p.organization === u.organization;
async function project(id, user) {
  const p = await Project.findById(id);
  if (!p) throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  if (!allowed(p, user)) throw new ApiError(403, 'FORBIDDEN', 'Project access denied');
  return p;
}
async function media(id, user) {
  const a = await Media.findById(id);
  if (!a) throw new ApiError(404, 'NOT_FOUND', 'Media not found');
  await project(a.projectId, user);
  return a;
}
exports.register = async (body) => {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(body.password || ''))
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Password must be at least 8 characters and include upper, lower, and numeric characters',
    );
  const count = await User.countDocuments();
  const user = await User.create({
    name: body.name,
    email: body.email,
    passwordHash: await bcrypt.hash(body.password, 12),
    role: count === 0 ? 'ADMIN' : 'VIEWER',
  });
  return authData(user);
};
function authData(user) {
  const token = jwt.sign({ sub: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  return { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token };
}
exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  return authData(user);
};
exports.listProjects = async (u, q) => {
  const { page, limit, skip } = pageOf(q);
  const filter = u.role === 'ADMIN' ? {} : { createdBy: u._id };
  if (q.status) filter.status = q.status;
  if (q.search) filter.name = { $regex: q.search, $options: 'i' };
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};
exports.createProject = async (b, u) => Project.create({ ...b, createdBy: u._id });
exports.getProject = project;
exports.updateProject = async (id, b, u) => {
  const p = await project(id, u);
  Object.assign(p, b);
  return p.save();
};
exports.deleteProject = async (id, u) => {
  const p = await project(id, u);
  p.status = 'ARCHIVED';
  await p.save();
  return p;
};
async function mediaFilter(q, u) {
  const f = {};
  if (q.projectId) {
    await project(q.projectId, u);
    f.projectId = q.projectId;
  } else if (u.role !== 'ADMIN') {
    const ps = await Project.find({ createdBy: u._id }).select('_id').lean();
    f.projectId = { $in: ps.map((x) => x._id) };
  }
  for (const k of ['evidenceType', 'resourceType', 'processingStatus'])
    if (q[k]) f[k] = String(q[k]);
  const like = (v) => new RegExp(escapeRegex(v), 'i');
  if (q.activity) f['activities.name'] = like(q.activity);
  if (q.object) f['objects.name'] = like(q.object);
  if (q.signal) f['environmentalSignals.name'] = like(q.signal);
  if (q.location) f['location.name'] = like(q.location);
  if (q.locationSource) f['location.source'] = String(q.locationSource);
  if (Number.isFinite(Number(q.minConfidence)) && q.minConfidence !== '')
    f.aiConfidence = { $gte: Number(q.minConfidence) };
  if (q.from || q.to)
    f.captureDate = {
      ...(q.from ? { $gte: new Date(q.from) } : {}),
      ...(q.to ? { $lte: new Date(q.to) } : {}),
    };
  return f;
}
exports.listMedia = async (q, u) => {
  const { page, limit, skip } = pageOf(q);
  const f = await mediaFilter(q, u);
  const [items, total] = await Promise.all([
    Media.find(f)
      .select('-embedding')
      .sort({ captureDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Media.countDocuments(f),
  ]);
  return {
    items: items.map(listItem),
    total,
    page,
    limit,
  };
};
exports.upload = async (files, body, u) => {
  if (!files?.length)
    throw new ApiError(400, 'INVALID_FILE', 'At least one media file is required');
  await project(body.projectId, u);
  let userLocation;
  if (body.location) {
    try {
      userLocation = JSON.parse(body.location);
    } catch (_err) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Location must be valid JSON');
    }
    if (
      !Number.isFinite(Number(userLocation.lat)) ||
      !Number.isFinite(Number(userLocation.lng)) ||
      Math.abs(userLocation.lat) > 90 ||
      Math.abs(userLocation.lng) > 180
    )
      throw new ApiError(400, 'VALIDATION_ERROR', 'Location coordinates are invalid');
    userLocation.source = 'USER_PROVIDED';
  }
  const saved = [];
  for (const file of files) {
    const exif = file.mimetype.startsWith('image/')
      ? require('../utils/exif').extractExif(file.buffer)
      : {};
    const up = await cloud.uploadBuffer(file.buffer, {
      mime: file.mimetype,
      folder: projectFolder(body.projectId, body.evidenceType),
    });
    const a = await Media.create({
      projectId: body.projectId,
      uploadedBy: u._id,
      cloudinaryPublicId: up.public_id,
      secureUrl: up.secure_url,
      storage: up.storage || 'cloudinary',
      phash: up.phash,
      resourceType: up.resource_type === 'video' ? 'video' : 'image',
      format: up.format,
      bytes: up.bytes,
      width: up.width,
      height: up.height,
      duration: up.duration,
      originalFilename: file.originalname,
      evidenceType: body.evidenceType || 'FIELD_EVIDENCE',
      captureDate: body.captureDate || exif.captureDate,
      location: userLocation || exif.location || { source: 'UNKNOWN' },
    });
    saved.push(a);
    await enqueue(a._id);
  }
  return saved;
};
exports.getMedia = async (id, u) => withUrls(lean(await media(id, u)));
exports.updateMedia = async (id, b, u) => {
  const a = await media(id, u);
  for (const k of ['location', 'evidenceType', 'captureDate']) if (b[k] !== undefined) a[k] = b[k];
  return a.save();
};
exports.deleteMedia = async (id, u) => {
  const a = await media(id, u);
  await cloud.destroy(a.cloudinaryPublicId, a.resourceType);
  await a.deleteOne();
  return { id };
};
exports.retryMedia = async (id, u) => {
  const a = await media(id, u);
  a.processingStatus = 'PENDING';
  a.processingError = undefined;
  await a.save();
  await enqueue(a._id);
  return a;
};
exports.search = async (q, u) => {
  const words = [
    ...new Set(
      String(q.q || '')
        .toLowerCase()
        .split(/[^a-z0-9-]+/)
        .filter((w) => w.length > 1 && !SEARCH_STOPWORDS.has(w)),
    ),
  ].slice(0, 8);
  if (!words.length)
    return {
      ...(await exports.listMedia(q, u)),
      queryUnderstanding: { keywords: [], provider: config.aiProvider },
    };
  const { page, limit, skip } = pageOf(q);
  const f = await mediaFilter(q, u);
  const patterns = words.map((w) => new RegExp(escapeRegex(w), 'i'));
  f.$or = SEARCH_FIELDS.flatMap((field) => patterns.map((p) => ({ [field]: p })));
  // Candidate set is bounded, then ranked by how many query words each asset matches.
  const candidates = await Media.find(f)
    .select('-embedding')
    .sort({ captureDate: -1 })
    .limit(1000)
    .lean();
  const ranked = candidates
    .map((a) => {
      const text = SEARCH_FIELDS.map((field) =>
        field.split('.').reduce((v, k) => (Array.isArray(v) ? v.map((x) => x?.[k]) : v?.[k]), a),
      )
        .flat()
        .join(' ')
        .toLowerCase();
      const matched = words.filter((w) => text.includes(w));
      return { a, score: matched.length, matched };
    })
    .sort((x, y) => y.score - x.score);
  const items = ranked.slice(skip, skip + limit).map(({ a, score, matched }) => {
    return { ...listItem(a), searchScore: score / words.length, matchedTerms: matched };
  });
  return {
    items,
    total: ranked.length,
    page,
    limit,
    queryUnderstanding: { keywords: words, provider: config.aiProvider },
  };
};
exports.compare = async (b, u) => {
  const [before, after] = await Promise.all([
    media(b.beforeId || b.mediaIdBefore, u),
    media(b.afterId || b.mediaIdAfter, u),
  ]);
  if (String(before.projectId) !== String(after.projectId))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Media must belong to the same project');
  const { imageInputFor } = require('./media/imageInput');
  const [beforeImage, afterImage] = await Promise.all([
    imageInputFor(before),
    imageInputFor(after),
  ]);
  const result = await createProvider().compareImages({
    before: beforeImage,
    after: afterImage,
    beforeUrl: before.secureUrl,
    afterUrl: after.secureUrl,
  });
  const doc = await Analysis.create({
    projectId: before.projectId,
    mediaIds: [before._id, after._id],
    analysisType: 'COMPARE',
    result,
    confidence: result.confidence,
    provider: config.aiProvider,
    model:
      result.model ||
      (config.aiProvider === 'mock' ? 'impactlens-mock-v1' : config.aiModel || config.aiProvider),
    version: 'v1',
  });
  return {
    ...result,
    analysisId: doc._id,
    createdAt: doc.createdAt,
    beforeUrl: deliveryUrls(before).previewUrl,
    afterUrl: deliveryUrls(after).previewUrl,
    before: mediaCard(before),
    after: mediaCard(after),
    // Cloudinary-rendered side-by-side image, when both captures live in Cloudinary.
    compositeUrl:
      isCloudinaryAsset(before) && isCloudinaryAsset(after)
        ? comparisonComposite(before.cloudinaryPublicId, after.cloudinaryPublicId)
        : undefined,
    capturedBefore: before.captureDate,
    capturedAfter: after.captureDate,
  };
};
exports.projectAssets = async (id, u, q = {}) => {
  await project(id, u);
  return Media.find({ projectId: id, ...q })
    .sort({ captureDate: 1 })
    .lean();
};
exports.timeline = async (id, u) => {
  const assets = await exports.projectAssets(id, u);
  const groups = {};
  for (const a of assets) {
    const d = a.captureDate || a.uploadDate;
    const key = d.toISOString().slice(0, 7);
    groups[key] ||= {
      month: key,
      label: new Date(`${key}-01T00:00:00Z`).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      assetCount: 0,
      activities: [],
      highlights: [],
      assetIds: [],
      evidenceTypes: {},
    };
    const g = groups[key];
    g.assetCount++;
    g.activities.push(...(a.activities || []).map((x) => x.name));
    g.assetIds.push(a._id);
    g.evidenceTypes[a.evidenceType] = (g.evidenceTypes[a.evidenceType] || 0) + 1;
    if (g.highlights.length < 4) g.highlights.push(mediaCard(a));
  }
  return Object.values(groups).map((g) => ({ ...g, activities: [...new Set(g.activities)] }));
};
exports.coverage = async (id, u) => {
  const p = await project(id, u);
  const assets = await exports.projectAssets(id, u);
  const expected = p.expectedEvidenceCategories || [];
  const found = new Set(
    assets.flatMap((a) => (a.activities || []).map((x) => x.name.toLowerCase())),
  );
  const covered = expected.filter((c) =>
    [...found].some((f) => f.includes(c.toLowerCase().split(' ')[0])),
  );
  const missing = expected.filter((x) => !covered.includes(x));
  const follow = assets.filter((a) => a.evidenceType === 'FOLLOW_UP');
  const gaps = missing.map((type) => ({
    type,
    message: `No evidence found for ${type}`,
    suggestedAction: `Capture ${type.toLowerCase()} evidence`,
  }));
  if (!follow.length)
    gaps.push({
      type: 'FOLLOW_UP',
      message: 'No follow-up evidence found',
      suggestedAction: 'Capture follow-up evidence 60–90 days after intervention',
    });
  return {
    coveragePercent: expected.length ? Math.round((covered.length / expected.length) * 100) : 0,
    covered,
    missing,
    gaps,
  };
};
exports.locations = async (id, u) => {
  const assets = await exports.projectAssets(id, u);
  const groups = {};
  for (const a of assets) {
    const key = a.location?.name || 'Unknown';
    groups[key] ||= {
      name: key,
      lat: a.location?.lat,
      lng: a.location?.lng,
      source: a.location?.source || 'UNKNOWN',
      count: 0,
    };
    groups[key].count++;
  }
  return Object.values(groups);
};
exports.comparisons = async (id, u) => {
  await project(id, u);
  const docs = await Analysis.find({ projectId: id, analysisType: 'COMPARE' })
    .sort({ createdAt: -1 })
    .populate('mediaIds')
    .lean();
  return docs.map((d) => ({
    ...d,
    mediaIds: (d.mediaIds || []).map((m) => m?._id || m),
    before: mediaCard(d.mediaIds?.[0]),
    after: mediaCard(d.mediaIds?.[1]),
  }));
};
exports.pairs = async (id, u) => {
  const a = await exports.projectAssets(id, u);
  const before = a.filter((x) => x.evidenceType === 'BEFORE'),
    after = a.filter((x) => x.evidenceType === 'AFTER');
  const time = (x) => new Date(x.captureDate || x.uploadDate || 0).getTime();
  // Heuristic: prefer later "after" captures from the same named location, then any later capture.
  return before
    .flatMap((b) =>
      after
        .filter((x) => time(x) >= time(b))
        .map((x) => ({
          b,
          x,
          sameLocation: Boolean(b.location?.name) && b.location?.name === x.location?.name,
          gapDays: Math.round((time(x) - time(b)) / 86400000),
        }))
        .sort((p, q) => q.sameLocation - p.sameLocation || p.gapDays - q.gapDays)
        .slice(0, 2),
    )
    .slice(0, 20)
    .map(({ b, x, sameLocation, gapDays }) => ({
      beforeId: b._id,
      afterId: x._id,
      before: mediaCard(b),
      after: mediaCard(x),
      reason: sameLocation
        ? `Same location (${b.location.name}), ${gapDays} days apart`
        : `${gapDays} days apart`,
    }));
};
exports.generateInsights = async (id, u) => {
  const assets = await exports.projectAssets(id, u);
  const existing = await Insight.find({ projectId: id })
    .select('statement evidenceMediaIds')
    .lean();
  const seen = new Set(
    existing.map((i) => `${i.statement}|${i.evidenceMediaIds.map(String).sort().join(',')}`),
  );
  const isNew = (statement, ids) => {
    const key = `${statement}|${ids.map(String).sort().join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const docs = [];
  // Activity-level insights cite every asset that carries the AI-detected activity.
  const byActivity = {};
  for (const a of assets.filter((x) => x.processingStatus === 'COMPLETED'))
    for (const act of a.activities || [])
      (byActivity[act.name] ||= []).push({ a, c: act.confidence });
  for (const [name, list] of Object.entries(byActivity)) {
    const places = [...new Set(list.map((x) => x.a.location?.name).filter(Boolean))];
    const statement = `${list.length} media assets${places.length ? ` across ${places.join(', ')}` : ''} show AI-detected ${name.toLowerCase()} activity.`;
    const ids = list.slice(0, 12).map((x) => x.a._id);
    if (!isNew(statement, ids)) continue;
    docs.push(
      await Insight.create({
        projectId: id,
        statement,
        kind: 'INFERRED',
        evidenceMediaIds: ids,
        model: list[0].a.analysis?.model,
        confidence:
          Math.round((list.reduce((s, x) => s + (x.c || 0), 0) / list.length) * 100) / 100,
      }),
    );
  }
  for (const a of assets.filter((x) => x.aiSummary).slice(0, 20)) {
    if (!isNew(a.aiSummary, [a._id])) continue;
    docs.push(
      await Insight.create({
        projectId: id,
        statement: a.aiSummary,
        kind: 'INFERRED',
        evidenceMediaIds: [a._id],
        model: a.analysis?.model,
        confidence: a.aiConfidence,
      }),
    );
  }
  return docs;
};
exports.insights = async (id, u) => {
  await project(id, u);
  return Insight.find({ projectId: id }).sort({ generatedAt: -1 }).lean();
};
exports.trace = async (id, u) => {
  const i = await Insight.findById(id).populate('evidenceMediaIds');
  if (!i) throw new ApiError(404, 'NOT_FOUND', 'Insight not found');
  await project(i.projectId, u);
  return {
    insight: i,
    sources: i.evidenceMediaIds.map((a) => ({
      mediaId: a._id,
      publicId: a.cloudinaryPublicId,
      url: a.secureUrl,
      ...deliveryUrls(a),
      originalFilename: a.originalFilename,
      aiConfidence: a.aiConfidence,
      observedInferred: a.observedInferred,
      location: a.location,
      transformations: a.transformations,
      analysis: a.analysis,
      capturedAt: a.captureDate,
    })),
  };
};
exports.dashboard = async (id, u) => {
  await project(id, u);
  const [assets, coverage] = await Promise.all([
    Media.aggregate([
      { $match: { projectId: require('mongoose').Types.ObjectId.createFromHexString(String(id)) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          analyzed: { $sum: { $cond: [{ $eq: ['$processingStatus', 'COMPLETED'] }, 1, 0] } },
          activities: { $addToSet: '$activities.name' },
          locations: { $addToSet: '$location.name' },
          signals: { $addToSet: '$environmentalSignals.name' },
        },
      },
    ]),
    exports.coverage(id, u),
  ]);
  const x = assets[0] || {};
  const uniq = (v) => [...new Set((v || []).flat().filter(Boolean))];
  return {
    totalMedia: x.total || 0,
    aiAnalyzed: x.analyzed || 0,
    activities: uniq(x.activities),
    locations: uniq(x.locations),
    beforeAfterPairs: (await exports.pairs(id, u)).length,
    evidenceCoverage: coverage,
    environmentalSignals: uniq(x.signals),
  };
};
exports.overview = async (u) => {
  const projects =
    u.role === 'ADMIN'
      ? await Project.find().select('_id name status').lean()
      : await Project.find({ createdBy: u._id }).select('_id name status').lean();
  const projectIds = projects.map((x) => x._id);
  const names = Object.fromEntries(projects.map((p) => [String(p._id), p.name]));
  const scope = { projectId: { $in: projectIds } };
  const [mediaCount, statusGroups, recentMedia, recentReports, reportCount] = await Promise.all([
    Media.countDocuments(scope),
    Media.aggregate([
      { $match: scope },
      { $group: { _id: '$processingStatus', count: { $sum: 1 } } },
    ]),
    Media.aggregate([
      { $match: scope },
      { $sort: { createdAt: -1 } },
      { $limit: 200 },
      {
        $group: {
          _id: {
            projectId: '$projectId',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          },
          count: { $sum: 1 },
          at: { $max: '$createdAt' },
        },
      },
      { $sort: { at: -1 } },
      { $limit: 6 },
    ]),
    Report.find(scope)
      .sort({ createdAt: -1 })
      .limit(4)
      .select('title projectId createdAt isPublic')
      .lean(),
    Report.countDocuments(scope),
  ]);
  const byStatus = Object.fromEntries(statusGroups.map((g) => [g._id, g.count]));
  const recentActivity = [
    ...recentMedia.map((g) => ({
      type: 'UPLOAD',
      projectId: g._id.projectId,
      projectName: names[String(g._id.projectId)],
      count: g.count,
      at: g.at,
    })),
    ...recentReports.map((r) => ({
      type: 'REPORT',
      projectId: r.projectId,
      projectName: names[String(r.projectId)],
      reportId: r._id,
      title: r.title,
      isPublic: r.isPublic,
      at: r.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);
  return {
    projectCount: projects.length,
    activeProjectCount: projects.filter((p) => p.status === 'ACTIVE').length,
    mediaCount,
    analyzedCount: byStatus.COMPLETED || 0,
    pendingCount: (byStatus.PENDING || 0) + (byStatus.PROCESSING || 0),
    failedCount: byStatus.FAILED || 0,
    reportCount,
    recentActivity,
  };
};
async function reportContent(id, u) {
  const p = await project(id, u);
  const [assets, coverage, timeline, insights] = await Promise.all([
    exports.projectAssets(id, u),
    exports.coverage(id, u),
    exports.timeline(id, u),
    exports.insights(id, u),
  ]);
  const analyzed = assets.filter((a) => a.processingStatus === 'COMPLETED');
  return {
    overview: {
      name: p.name,
      organization: p.organization,
      description: p.description,
      category: p.category,
      location: p.location?.name,
      startDate: p.startDate,
      endDate: p.endDate,
    },
    kpis: {
      totalMedia: assets.length,
      aiAnalyzed: analyzed.length,
      locations: new Set(assets.map((a) => a.location?.name).filter(Boolean)).size,
      coveragePercent: coverage.coveragePercent,
      averageConfidence: analyzed.length
        ? Math.round(
            (analyzed.reduce((s, a) => s + (a.aiConfidence || 0), 0) / analyzed.length) * 100,
          ) / 100
        : null,
    },
    coverage: {
      coveragePercent: coverage.coveragePercent,
      covered: coverage.covered,
      missing: coverage.missing,
    },
    objectives: p.goals,
    timeline,
    mediaGallery: assets.map((a) => ({
      id: a._id,
      url: a.secureUrl,
      ...deliveryUrls(a),
      summary: a.aiSummary,
      evidenceType: a.evidenceType,
      captureDate: a.captureDate,
      location: a.location?.name,
    })),
    activities: [...new Set(assets.flatMap((a) => (a.activities || []).map((x) => x.name)))],
    locationMap: await exports.locations(id, u),
    beforeAfter: await exports.pairs(id, u),
    aiObservations: insights.map((x) => ({
      kind: x.kind,
      statement: x.statement,
      confidence: x.confidence,
      model: x.model,
      evidenceMediaIds: x.evidenceMediaIds,
    })),
    evidenceReferences: assets.map((a) => ({
      id: a._id,
      cloudinaryPublicId: a.cloudinaryPublicId,
      model: a.analysis?.model,
      timestamp: a.analysis?.analyzedAt,
    })),
    evidenceGaps: coverage.gaps,
    methodology: 'AI-generated observations are not proof of real-world outcomes.',
    traceability: assets.map((a) => ({
      assetId: a._id,
      publicId: a.cloudinaryPublicId,
      model: a.analysis?.model,
      analyzedAt: a.analysis?.analyzedAt,
    })),
    disclaimer:
      'Insights are generated from uploaded visual evidence and should be verified against original project records.',
  };
}
exports.generateReport = async (b, u) => {
  const content = await reportContent(b.projectId, u);
  const r = await Report.create({
    projectId: b.projectId,
    title: b.title || 'Impact Evidence Report',
    content,
    mediaIds: content.evidenceReferences.map((x) => x.id),
    generatedBy: u._id,
  });
  return r;
};
/** Compact, factual evidence digest the AI must ground stories and campaign copy in. */
async function evidenceDigest(p, u) {
  const [assets, coverage, insights] = await Promise.all([
    exports.projectAssets(p._id, u),
    exports.coverage(p._id, u),
    exports.insights(p._id, u),
  ]);
  const analyzed = assets.filter((a) => a.processingStatus === 'COMPLETED');
  const count = (list) =>
    Object.entries(
      list.reduce((m, k) => {
        if (k) m[k] = (m[k] || 0) + 1;
        return m;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, n]) => ({ name, assets: n }));
  const dates = assets
    .map((a) => a.captureDate || a.uploadDate)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);
  return {
    mediaAssets: assets.length,
    analyzed: analyzed.length,
    activities: count(analyzed.flatMap((a) => (a.activities || []).map((x) => x.name))),
    environmentalSignals: count(
      analyzed.flatMap((a) => (a.environmentalSignals || []).map((x) => x.name)),
    ),
    locations: count(assets.map((a) => a.location?.name)),
    dateRange: dates.length
      ? {
          from: new Date(dates[0]).toISOString().slice(0, 10),
          to: new Date(dates.at(-1)).toISOString().slice(0, 10),
        }
      : null,
    evidenceCoveragePercent: coverage.coveragePercent,
    evidenceGaps: coverage.gaps.map((g) => g.message),
    sampleObservations: analyzed
      .flatMap((a) => a.observedInferred?.observed || [])
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 10),
    insightStatements: insights.slice(0, 8).map((i) => i.statement),
  };
}
exports.story = async (b, u) => {
  const p = await project(b.projectId, u);
  const evidence = await evidenceDigest(p, u);
  return {
    title: p.name,
    story: await createProvider().generateSummary({ project: p, evidence }),
    disclaimer: 'AI-generated from analyzed field media; verify against project records.',
  };
};
exports.campaign = async (b, u) => {
  const p = await project(b.projectId, u);
  const evidence = await evidenceDigest(p, u);
  return createProvider().generateCampaign({ project: p, evidence });
};
exports.report = async (id, u) => {
  const r = await Report.findById(id);
  if (!r) throw new ApiError(404, 'NOT_FOUND', 'Report not found');
  await project(r.projectId, u);
  return r;
};
exports.reportByProject = async (id, u, q) => {
  await project(id, u);
  const { page, limit, skip } = pageOf(q);
  const [items, total] = await Promise.all([
    Report.find({ projectId: id })
      .sort({ createdAt: -1 })
      .select('-content.mediaGallery -content.traceability -content.evidenceReferences')
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments({ projectId: id }),
  ]);
  return { items, total, page, limit };
};
exports.publish = async (id, u) => {
  const r = await exports.report(id, u);
  r.isPublic = true;
  r.publicSlug ||= crypto.randomBytes(20).toString('hex');
  return r.save();
};
function publicValue(value) {
  if (Array.isArray(value)) return value.map(publicValue);
  if (!value || typeof value !== 'object') return value;
  // Dates and ObjectIds are leaf values; walking their keys would turn them into {}.
  if (value instanceof Date) return value;
  if (value._bsontype === 'ObjectId' || value._bsontype === 'ObjectID') return String(value);
  const out = {};
  for (const [key, item] of Object.entries(value))
    if (!['_id', 'id', 'generatedBy', 'userEmail', 'email', 'publicSlug'].includes(key))
      out[key] = publicValue(item);
  return out;
}
exports.publicReport = async (slug) => {
  const r = await Report.findOne({ publicSlug: slug, isPublic: true }).populate(
    'projectId',
    'name organization category location',
  );
  if (!r) throw new ApiError(404, 'NOT_FOUND', 'Public report not found');
  return {
    title: r.title,
    project: {
      name: r.projectId.name,
      organization: r.projectId.organization,
      category: r.projectId.category,
    },
    content: publicValue(r.content),
    publishedAt: r.updatedAt,
  };
};
exports.pdf = async (id, u) => {
  const r = await exports.report(id, u);
  return require('./report/pdf.service').renderReportPdf(r);
};
exports.health = () => {
  const cloudinary = cloud.getCloudinaryStatus ? cloud.getCloudinaryStatus() : 'demo-mode';
  return {
    status: 'ok',
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    // configured | misconfigured (credentials rejected, local fallback) | demo-mode (not set up)
    cloudinary,
    storage: cloud.cloudinaryReady && cloud.cloudinaryReady() ? 'cloudinary' : 'local',
    aiProvider: config.aiProvider,
  };
};
