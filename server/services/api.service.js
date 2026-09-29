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
exports.listMedia = async (q, u) => {
  const { page, limit, skip } = pageOf(q);
  const f = {};
  if (q.projectId) {
    await project(q.projectId, u);
    f.projectId = q.projectId;
  } else if (u.role !== 'ADMIN') {
    const ps = await Project.find({ createdBy: u._id }).select('_id').lean();
    f.projectId = { $in: ps.map((x) => x._id) };
  }
  for (const k of ['evidenceType', 'resourceType', 'processingStatus']) if (q[k]) f[k] = q[k];
  if (q.activity) f['activities.name'] = new RegExp(q.activity, 'i');
  if (q.object) f['objects.name'] = new RegExp(q.object, 'i');
  if (q.from || q.to)
    f.captureDate = {
      ...(q.from ? { $gte: new Date(q.from) } : {}),
      ...(q.to ? { $lte: new Date(q.to) } : {}),
    };
  const [items, total] = await Promise.all([
    Media.find(f)
      .select('-embedding -secureUrl')
      .sort({ captureDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Media.countDocuments(f),
  ]);
  return { items, total, page, limit };
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
      resource_type: 'auto',
    });
    const a = await Media.create({
      projectId: body.projectId,
      uploadedBy: u._id,
      cloudinaryPublicId: up.public_id,
      secureUrl: up.secure_url,
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
exports.getMedia = media;
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
  const out = await exports.listMedia({ ...q, search: undefined }, u);
  const words = String(q.q || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const items = out.items.filter(
    (a) => !words.length || words.some((w) => JSON.stringify(a).toLowerCase().includes(w)),
  );
  return { ...out, items, queryUnderstanding: { keywords: words, provider: config.aiProvider } };
};
exports.compare = async (b, u) => {
  const [before, after] = await Promise.all([
    media(b.beforeId || b.mediaIdBefore, u),
    media(b.afterId || b.mediaIdAfter, u),
  ]);
  if (String(before.projectId) !== String(after.projectId))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Media must belong to the same project');
  const result = await createProvider().compareImages({
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
    model: 'impactlens-mock-v1',
    version: 'v1',
  });
  return {
    ...result,
    analysisId: doc._id,
    beforeUrl: before.secureUrl,
    afterUrl: after.secureUrl,
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
      label: key.slice(5),
      assetCount: 0,
      activities: [],
      highlights: [],
      assetIds: [],
    };
    const g = groups[key];
    g.assetCount++;
    g.activities.push(...(a.activities || []).map((x) => x.name));
    g.assetIds.push(a._id);
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
  return Analysis.find({ projectId: id, analysisType: 'COMPARE' }).sort({ createdAt: -1 }).lean();
};
exports.pairs = async (id, u) => {
  const a = await exports.projectAssets(id, u);
  const before = a.filter((x) => x.evidenceType === 'BEFORE'),
    after = a.filter((x) => x.evidenceType === 'AFTER');
  return before
    .flatMap((b) => after.slice(0, 10).map((x) => ({ beforeId: b._id, afterId: x._id })))
    .slice(0, 20);
};
exports.generateInsights = async (id, u) => {
  const assets = await exports.projectAssets(id, u);
  const docs = [];
  for (const a of assets.filter((x) => x.aiSummary).slice(0, 20)) {
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
  return {
    totalMedia: x.total || 0,
    aiAnalyzed: x.analyzed || 0,
    activities: (x.activities || []).flat().filter(Boolean),
    locations: (x.locations || []).filter(Boolean),
    beforeAfterPairs: (await exports.pairs(id, u)).length,
    evidenceCoverage: coverage,
    environmentalSignals: (x.signals || []).flat().filter(Boolean),
  };
};
exports.overview = async (u) => {
  const ids =
    u.role === 'ADMIN'
      ? await Project.find().select('_id').lean()
      : await Project.find({ createdBy: u._id }).select('_id').lean();
  return {
    projectCount: ids.length,
    mediaCount: await Media.countDocuments({ projectId: { $in: ids.map((x) => x._id) } }),
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
  return {
    overview: { name: p.name, organization: p.organization, description: p.description },
    objectives: p.goals,
    timeline,
    mediaGallery: assets.map((a) => ({ id: a._id, url: a.secureUrl, summary: a.aiSummary })),
    activities: [...new Set(assets.flatMap((a) => (a.activities || []).map((x) => x.name)))],
    locationMap: await exports.locations(id, u),
    beforeAfter: await exports.pairs(id, u),
    aiObservations: insights.map((x) => ({ kind: x.kind, statement: x.statement })),
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
exports.story = async (b, u) => {
  const p = await project(b.projectId, u);
  return {
    title: p.name,
    story: await createProvider().generateSummary({ project: p }),
    disclaimer: 'AI-generated; verify against project records.',
  };
};
exports.campaign = async (b, u) => {
  const p = await project(b.projectId, u);
  return {
    socialCaption: `Evidence from ${p.name}: documented field activity, traceable to source media.`,
    websiteStory: await createProvider().generateSummary({ project: p }),
    executiveSummary: `${p.name} — visual evidence summary.`,
    presentationSummary: `${p.name}: project evidence and gaps.`,
  };
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
    Report.find({ projectId: id }).skip(skip).limit(limit).lean(),
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
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () =>
      resolve({ contentType: 'application/pdf', content: Buffer.concat(chunks) }),
    );
    doc.on('error', reject);
    doc.fontSize(22).text(r.title || 'Impact Evidence Report');
    doc.moveDown();
    doc
      .fontSize(10)
      .text('AI-generated visual evidence summary. Verify against original project records.');
    doc.moveDown();
    doc.fontSize(12).text(JSON.stringify(r.content, null, 2), { lineGap: 4 });
    doc.end();
  });
};
exports.health = () => ({
  status: 'ok',
  database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
  cloudinary:
    config.cloudinary.mode === 'mock' ||
    !config.cloudinary.cloudName ||
    !config.cloudinary.apiKey ||
    !config.cloudinary.apiSecret
      ? 'demo-mode'
      : 'configured',
  aiProvider: config.aiProvider,
});
