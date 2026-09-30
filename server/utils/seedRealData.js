/**
 * Seeds the real demo dataset: openly licensed Wikimedia Commons field photos (see
 * seed-data/real-dataset.json), stored via Cloudinary or the local fallback and analyzed by the
 * configured AI provider. Idempotent; `--reset` re-imports the two demo projects from scratch.
 *
 *   npm run seed:real            # import missing photos, analyze, generate insights
 *   npm run seed:real -- --reset
 *   npm run seed:real -- --reanalyze   # re-run AI analysis on all demo photos
 */
const bcrypt = require('bcryptjs');
const { connect, disconnect } = require('../config/db');
const { config } = require('../config/env');
const User = require('../models/User');
const Project = require('../models/Project');
const Media = require('../models/MediaAsset');
const Insight = require('../models/Insight');
const Analysis = require('../models/Analysis');
const Report = require('../models/Report');
const { extractExif } = require('./exif');
const { fingerprint } = require('../services/integrity/fingerprint');
const fsp = require('fs/promises');
const cloud = require('../services/cloudinary/upload.service');
const { projectFolder } = require('../services/cloudinary/folders');
const manifest = require('./seed-data/real-dataset.json');

const UA = { 'User-Agent': 'ImpactLens/1.0 (open-licence demo dataset importer)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (v) =>
  String(v || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function fetchJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: UA });
    if (r.status === 429 || r.status >= 500) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} for ${url}`);
    return r.json();
  }
  throw new Error(`Gave up on ${url}`);
}
async function fetchBuffer(url, headers = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { ...UA, ...headers } });
    if (r.status === 429 || r.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!r.ok && r.status !== 206) throw new Error(`${r.status} for ${url}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error(`Gave up on ${url}`);
}

// Nominatim: max 1 request/second (OSM usage policy).
let lastGeo = 0;
async function nominatim(path) {
  const wait = lastGeo + 1100 - Date.now();
  if (wait > 0) await sleep(wait);
  lastGeo = Date.now();
  try {
    return await fetchJson(
      `https://nominatim.openstreetmap.org/${path}&format=jsonv2&accept-language=en`,
    );
  } catch {
    return null;
  }
}
async function placeName(lat, lng) {
  const r = await nominatim(`reverse?lat=${lat}&lon=${lng}&zoom=12`);
  const a = r?.address || {};
  return (
    [a.suburb || a.city || a.town || a.village || a.county, a.state].filter(Boolean).join(', ') ||
    undefined
  );
}
async function geocode(name) {
  const r = await nominatim(`search?q=${encodeURIComponent(`${name}, India`)}&limit=1`);
  const hit = Array.isArray(r) ? r[0] : null;
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

/** Parses Commons' DateTimeOriginal strings ("2015-01-07 15:18:07", "October 2014", "11 August 2016 ..."). */
function parseCommonsDate(raw) {
  const s = stripHtml(raw);
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso)
    return new Date(
      Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 12), +(iso[5] || 0), +(iso[6] || 0)),
    );
  const d = new Date(
    s
      .replace(/\(.*$/, '')
      .replace(/^Taken on /i, '')
      .trim(),
  );
  return Number.isNaN(d.getTime()) ? undefined : d;
}

async function commonsInfo(title) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: title,
    prop: 'imageinfo|coordinates',
    iiprop: 'url|extmetadata|mime|size|timestamp',
    iiurlwidth: '1280',
  });
  const j = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const page = Object.values(j.query?.pages || {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) throw new Error(`Not found on Commons: ${title}`);
  const m = ii.extmetadata || {};
  return {
    pageUrl: ii.descriptionurl,
    originalUrl: ii.url,
    thumbUrl: ii.thumburl || ii.url,
    mime: ii.mime,
    uploadedAt: ii.timestamp ? new Date(ii.timestamp) : undefined,
    license: stripHtml(m.LicenseShortName?.value),
    licenseUrl: stripHtml(m.LicenseUrl?.value) || undefined,
    author: stripHtml(m.Artist?.value).slice(0, 120) || undefined,
    date: parseCommonsDate(m.DateTimeOriginal?.value),
    coords: page.coordinates?.[0]
      ? { lat: page.coordinates[0].lat, lng: page.coordinates[0].lon }
      : null,
  };
}

async function ensureUsers() {
  const creds = [
    ['admin@impactlens.demo', 'Admin123!', 'ADMIN', 'Demo Admin'],
    ['manager@impactlens.demo', 'Manager123!', 'PROJECT_MANAGER', 'Demo Manager'],
    ['viewer@impactlens.demo', 'Viewer123!', 'VIEWER', 'Demo Viewer'],
  ];
  const out = {};
  for (const [email, password, role, name] of creds) {
    let u = await User.findOne({ email });
    if (!u)
      u = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 10) });
    out[role] = u;
  }
  return out;
}

async function resetProject(p) {
  const assets = await Media.find({ projectId: p._id })
    .select('cloudinaryPublicId resourceType')
    .lean();
  for (const a of assets) await cloud.destroy(a.cloudinaryPublicId, a.resourceType).catch(() => {});
  await Promise.all([
    Media.deleteMany({ projectId: p._id }),
    Insight.deleteMany({ projectId: p._id }),
    Analysis.deleteMany({ projectId: p._id }),
    Report.deleteMany({ projectId: p._id }),
  ]);
}

async function importItem(project, item, owner) {
  // Idempotency check is local, so re-runs don't call the (rate-limited) Commons API.
  const title = item.title.replace(/^File:/, '');
  if (await Media.exists({ projectId: project._id, 'attribution.title': title })) return 'skipped';
  const info = await commonsInfo(item.title);
  // EXIF lives at the start of a JPEG, so a 256 KB range of the original is enough to read GPS/date.
  const head = await fetchBuffer(info.originalUrl, { Range: 'bytes=0-262143' }).catch(() => null);
  const exif = head ? extractExif(head) : {};
  const image = await fetchBuffer(info.thumbUrl);
  const print = await fingerprint(image);

  let location = { source: 'UNKNOWN' };
  if (exif.location)
    location = { ...exif.location, name: await placeName(exif.location.lat, exif.location.lng) };
  else if (info.coords)
    location = {
      ...info.coords,
      name: item.place || (await placeName(info.coords.lat, info.coords.lng)),
      source: 'USER_PROVIDED',
    };
  else if (item.place)
    location = {
      name: item.place,
      ...((await geocode(item.place)) || {}),
      source: 'USER_PROVIDED',
    };

  const up = await cloud.uploadBuffer(image, {
    mime: 'image/jpeg',
    folder: projectFolder(String(project._id), item.evidenceType),
  });
  const captureDate = exif.captureDate || info.date || info.uploadedAt;
  const asset = await Media.create({
    projectId: project._id,
    uploadedBy: owner._id,
    cloudinaryPublicId: up.public_id,
    secureUrl: up.secure_url,
    storage: up.storage,
    phash: up.phash,
    fingerprint: print,
    // Camera metadata comes from the original file (Commons thumbnails strip EXIF).
    camera: head ? exif.camera : undefined,
    resourceType: 'image',
    format: up.format || 'jpg',
    bytes: up.bytes || image.length,
    width: up.width,
    height: up.height,
    originalFilename: decodeURIComponent(item.title.replace(/^File:/, '')),
    captureDate,
    uploadDate: new Date(),
    location,
    evidenceType: item.evidenceType || 'FIELD_EVIDENCE',
    attribution: {
      source: 'Wikimedia Commons',
      title: item.title.replace(/^File:/, ''),
      url: info.pageUrl,
      author: info.author,
      license: info.license,
      licenseUrl: info.licenseUrl,
    },
    processingStatus: 'PENDING',
  });
  return { asset, gps: Boolean(exif.location), dated: Boolean(exif.captureDate || info.date) };
}

/** Adds fingerprints / camera metadata to assets imported before integrity checks existed. */
async function backfillIntegrity(projectIds) {
  const missing = await Media.find({
    projectId: { $in: projectIds },
    $or: [
      { 'fingerprint.sha256': { $exists: false } },
      // Camera metadata needs the Commons API (rate-limited), so it's opt-in.
      ...(process.argv.includes('--backfill-camera') ? [{ camera: { $exists: false } }] : []),
    ],
  });
  if (!missing.length) return;
  console.log(`
Backfilling integrity data for ${missing.length} assets`);
  for (const a of missing) {
    try {
      if (!a.fingerprint?.sha256) {
        const local = cloud.localPathFor(a.cloudinaryPublicId);
        const buf = local ? await fsp.readFile(local) : await fetchBuffer(a.secureUrl);
        a.fingerprint = await fingerprint(buf, { isImage: a.resourceType === 'image' });
      }
      if (
        process.argv.includes('--backfill-camera') &&
        a.attribution?.title &&
        a.camera?.hasExif === undefined
      ) {
        const info = await commonsInfo(`File:${a.attribution.title}`);
        const head = await fetchBuffer(info.originalUrl, { Range: 'bytes=0-262143' }).catch(
          () => null,
        );
        if (head) a.camera = extractExif(head).camera;
        await sleep(1500);
      }
      await a.save();
    } catch (err) {
      console.log(`  ! ${a.originalFilename}: ${err.message}`);
    }
  }
}

async function waitForAnalysis(projectIds) {
  const started = Date.now();
  for (;;) {
    const counts = await Media.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$processingStatus', n: { $sum: 1 } } },
    ]);
    const by = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    const open = (by.PENDING || 0) + (by.PROCESSING || 0);
    process.stdout.write(
      `\r  analysis: ${by.COMPLETED || 0} done, ${open} in progress, ${by.FAILED || 0} failed   `,
    );
    if (!open) return process.stdout.write('\n');
    if (Date.now() - started > 30 * 60_000)
      return console.log('\n  still running; the API will resume the rest on boot.');
    await sleep(3000);
  }
}

async function seedReal() {
  await connect();
  await cloud.verifyCloudinary();
  const { enqueue } = require('../jobs/queue');
  const svc = require('../services/api.service');
  console.log(
    `AI provider: ${config.aiProvider} | storage: ${cloud.cloudinaryReady() ? 'Cloudinary' : 'local disk'}`,
  );
  const users = await ensureUsers();
  const owner = users.PROJECT_MANAGER;
  const projectIds = [];
  for (const spec of manifest.projects) {
    let project = await Project.findOne({ name: spec.name });
    if (project && process.argv.includes('--reset')) await resetProject(project);
    const fields = {
      name: spec.name,
      organization: spec.organization,
      category: spec.category,
      description: spec.description,
      location: { name: spec.location.name, ...((await geocode(spec.location.name)) || {}) },
      goals: spec.goals,
      status: 'ACTIVE',
      expectedEvidenceCategories: spec.expectedEvidenceCategories,
      siteRadiusKm: spec.siteRadiusKm ?? null,
      createdBy: owner._id,
    };
    project = project ? await Object.assign(project, fields).save() : await Project.create(fields);
    projectIds.push(project._id);
    console.log(`\n${spec.name}`);
    const queued = [];
    for (const item of spec.items) {
      try {
        const r = await importItem(project, item, owner);
        if (r === 'skipped') console.log(`  = ${item.title.slice(5, 70)}`);
        else {
          queued.push(r.asset._id);
          console.log(
            `  + ${item.title.slice(5, 70)}${r.gps ? ' [EXIF GPS]' : ''}${r.dated ? '' : ' [no capture date]'}`,
          );
        }
      } catch (err) {
        console.log(`  ! ${item.title.slice(5, 70)}: ${err.message}`);
      }
      await sleep(400);
    }
    // Project timeframe follows the real capture dates.
    const range = await Media.aggregate([
      { $match: { projectId: project._id } },
      { $group: { _id: null, from: { $min: '$captureDate' }, to: { $max: '$captureDate' } } },
    ]);
    if (range[0])
      await Project.updateOne(
        { _id: project._id },
        { startDate: range[0].from, endDate: range[0].to },
      );
    queued.forEach((id) => enqueue(id));
  }
  await backfillIntegrity(projectIds);
  // --reanalyze: re-run AI on every demo asset (e.g. after a prompt or model change).
  if (process.argv.includes('--reanalyze')) {
    await Media.updateMany(
      { projectId: { $in: projectIds } },
      { $set: { processingStatus: 'PENDING', attempts: 0 }, $unset: { processingError: 1 } },
    );
  }
  // Re-queue anything left unfinished by an earlier run.
  const leftover = await Media.find({
    projectId: { $in: projectIds },
    processingStatus: { $in: ['PENDING', 'PROCESSING', 'FAILED'] },
  })
    .select('_id')
    .lean();
  leftover.forEach(({ _id }) => enqueue(_id));
  await waitForAnalysis(projectIds);
  // Semantic-search vectors for analyzed photos that don't have one yet.
  const toEmbed = await Media.find({
    projectId: { $in: projectIds },
    processingStatus: 'COMPLETED',
    embeddingModel: { $exists: false },
  }).lean();
  if (toEmbed.length)
    console.log(
      `  embeddings created: ${await require('../services/ai/embeddings').embedAssets(toEmbed)}`,
    );
  for (const id of projectIds) {
    // Insights are derived from the analysis, so rebuild them from the final results.
    await Insight.deleteMany({ projectId: id });
    const made = await svc.generateInsights(id, users.ADMIN);
    console.log(`  insights generated for ${id}: ${made.length}`);
  }
  console.log(
    '\nDemo accounts: manager@impactlens.demo / Manager123!, admin@impactlens.demo / Admin123!, viewer@impactlens.demo / Viewer123!',
  );
  await disconnect();
}

seedReal().catch(async (e) => {
  console.error(e);
  await disconnect();
  process.exitCode = 1;
});
