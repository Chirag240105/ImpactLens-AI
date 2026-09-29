const bcrypt = require('bcryptjs');
const { connect, disconnect } = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Media = require('../models/MediaAsset');
const { DEFAULT_CATEGORIES } = require('../config/constants');
const fs = require('fs/promises');
const path = require('path');
async function seed() {
  await connect();
  if (process.argv.includes('--reset')) {
    await Promise.all([User.deleteMany({}), Project.deleteMany({}), Media.deleteMany({})]);
  }
  const creds = [
    ['admin@impactlens.demo', 'Admin123!', 'ADMIN'],
    ['manager@impactlens.demo', 'Manager123!', 'PROJECT_MANAGER'],
    ['viewer@impactlens.demo', 'Viewer123!', 'VIEWER'],
  ];
  const users = [];
  for (const [email, password, role] of creds) {
    let u = await User.findOne({ email });
    if (!u)
      u = await User.create({
        name: role === 'ADMIN' ? 'Demo Admin' : role === 'VIEWER' ? 'Demo Viewer' : 'Demo Manager',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
      });
    users.push(u);
  }
  let p = await Project.findOne({ name: 'Yamuna Urban Restoration Initiative' });
  if (!p)
    p = await Project.create({
      name: 'Yamuna Urban Restoration Initiative',
      description: 'Community-led riverbank restoration evidence demonstration.',
      organization: 'ImpactLens Demo NGO',
      category: 'Urban Restoration',
      location: { name: 'Delhi', lat: 28.6139, lng: 77.209 },
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      goals: ['Restore riverbank vegetation', 'Document community participation'],
      status: 'ACTIVE',
      expectedEvidenceCategories: DEFAULT_CATEGORIES,
      createdBy: users[1]._id,
    });
  if (process.argv.includes('--reset')) await Media.deleteMany({ projectId: p._id });
  const places = [
    ['Delhi', 28.6139, 77.209],
    ['Noida', 28.5355, 77.391],
    ['Ghaziabad', 28.6692, 77.4538],
  ];
  const acts = [
    'Site Preparation',
    'Cleaning',
    'Plantation',
    'Community Participation',
    'Infrastructure',
    'Restoration',
  ];
  const photos = [
    'photo-1511497584788-876760111969',
    'photo-1501004318641-b39e6451bec6',
    'photo-1518837695005-2083093ee35b',
    'photo-1529156069898-49953e39b3ac',
  ];
  for (let i = 0; i < 45; i++) {
    const captureDate = new Date(Date.UTC(2026, i < 40 ? Math.floor(i / 7) : 5, 2 + (i % 25)));
    const evidenceType =
      i < 8 ? 'BEFORE' : i < 16 ? 'AFTER' : i === 44 ? 'FOLLOW_UP' : 'FIELD_EVIDENCE';
    const place = places[i % 3];
    const activity = acts[i % acts.length];
    const filename = `${activity.toLowerCase().replaceAll(' ', '-')}-${i + 1}.jpg`;
    await Media.updateOne(
      { projectId: p._id, originalFilename: filename },
      {
        $setOnInsert: {
          projectId: p._id,
          uploadedBy: users[1]._id,
          secureUrl: `https://images.unsplash.com/${photos[i % photos.length]}?auto=format&fit=crop&w=1200&q=80`,
          cloudinaryPublicId: `demo/yamuna/${i + 1}`,
          resourceType: 'image',
          format: 'jpg',
          bytes: 300000,
          captureDate,
          uploadDate: captureDate,
          location: { name: place[0], lat: place[1], lng: place[2], source: 'USER_PROVIDED' },
          evidenceType,
          tags: [activity.toLowerCase()],
          objects: [{ name: 'people', confidence: 0.84 }],
          activities: [{ name: activity, confidence: 0.8 }],
          environmentalSignals: [{ name: i % 3 ? 'vegetation' : 'water', confidence: 0.72 }],
          aiDescription: `Field evidence of ${activity.toLowerCase()} in ${place[0]}.`,
          aiSummary: `AI-detected ${activity.toLowerCase()} evidence.`,
          aiConfidence: 0.78,
          observedInferred: {
            observed: ['People and outdoor work are visible.'],
            inferred: [`The activity may be ${activity.toLowerCase()}.`],
          },
          processingStatus: 'COMPLETED',
          analysis: {
            model: 'impactlens-mock-v1',
            provider: 'MockProvider',
            version: 'seed-v1',
            analyzedAt: captureDate,
          },
        },
      },
      { upsert: true },
    );
  }
  if (process.argv.includes('--upload')) {
    const dir = path.join(__dirname, '..', 'seed-assets');
    try {
      const files = (await fs.readdir(dir)).filter((name) => !name.startsWith('.'));
      const { uploadBuffer } = require('../services/cloudinary/upload.service');
      const { enqueue } = require('../jobs/queue');
      for (const name of files) {
        const buffer = await fs.readFile(path.join(dir, name));
        const mime = name.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
        const up = await uploadBuffer(buffer, {
          mime,
          folder: `impactlens/projects/${p._id}/field-evidence`,
        });
        const asset = await Media.create({
          projectId: p._id,
          uploadedBy: users[1]._id,
          cloudinaryPublicId: up.public_id,
          secureUrl: up.secure_url,
          resourceType: up.resource_type === 'video' ? 'video' : 'image',
          originalFilename: name,
          processingStatus: 'PENDING',
        });
        await enqueue(asset._id);
      }
      console.log(`Uploaded ${files.length} seed assets.`);
    } catch (err) {
      if (err.code === 'ENOENT') console.log('No server/seed-assets folder found.');
      else throw err;
    }
  }
  console.log(
    'Demo credentials: admin@impactlens.demo / Admin123!; manager@impactlens.demo / Manager123!; viewer@impactlens.demo / Viewer123!',
  );
  await disconnect();
}
seed().catch(async (e) => {
  console.error(e.message);
  await disconnect();
  process.exitCode = 1;
});
