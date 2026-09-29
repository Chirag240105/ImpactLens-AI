const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
let mockedFailAI = false;
jest.mock('../services/cloudinary/upload.service', () => ({
  uploadBuffer: async (_buffer, options) => ({
    public_id: `test/${Date.now()}-${Math.random()}`,
    secure_url: 'https://example.test/media.jpg',
    resource_type: options.resource_type,
    format: 'jpg',
    bytes: 100,
    width: 1,
    height: 1,
  }),
  destroy: async () => {},
  localPathFor: () => null,
  cloudinaryReady: () => false,
}));
jest.mock('../services/ai/providerFactory', () => ({
  createProvider: () => ({
    analyzeImage: async ({ filename }) => {
      if (mockedFailAI && filename === 'retry.jpg') throw new Error('simulated provider outage');
      return {
        description: 'People working outdoors.',
        tags: ['plantation'],
        objects: [{ name: 'people', confidence: 0.8 }],
        activities: [{ name: 'Plantation', confidence: 0.8 }],
        environmentalSignals: [{ name: 'vegetation', confidence: 0.7 }],
        aiSummary: 'AI-detected plantation activity.',
        aiConfidence: 0.8,
        observedInferred: {
          observed: ['People are visible.'],
          inferred: ['The activity may be plantation.'],
        },
        model: 'test-model',
      };
    },
    compareImages: async () => ({
      visualChangeScore: 0.4,
      observedChanges: ['Visible scene differs.'],
      inferredNotes: [],
      confidence: 0.7,
    }),
    generateSummary: async () => 'A test impact story.',
    generateCampaign: async ({ project }) => ({
      socialCaption: `Caption for ${project.name}`,
      websiteStory: 'Story',
      executiveSummary: 'Summary',
      presentationSummary: 'Slides',
    }),
    understandQuery: async () => ({ keywords: [] }),
  }),
}));
const app = require('../app');
const Media = require('../models/MediaAsset');
let mongo;
let adminToken;
let viewerToken;
let projectId;
let mediaId;
let reportId;
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=',
  'base64',
);
async function waitForState(id, state) {
  for (let i = 0; i < 40; i++) {
    const asset = await Media.findById(id).lean();
    if (asset?.processingStatus === state) return asset;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Asset did not reach ${state}`);
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60000);
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('ImpactLens API integration', () => {
  test('health uses the response envelope', async () => {
    const r = await request(app).get('/api/health').expect(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.status).toBe('ok');
  });
  test('register/login/me returns safe user and first user ADMIN', async () => {
    const r = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Admin', email: 'admin@test.local', password: 'StrongPass123' })
      .expect(201);
    adminToken = r.body.data.token;
    expect(r.body.data.user.role).toBe('ADMIN');
    expect(r.body.data.user.passwordHash).toBeUndefined();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'StrongPass123' })
      .expect(200);
    expect(login.body.data.token).toBeTruthy();
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });
  test('validates credentials and enforces viewer RBAC', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'x', email: 'bad', password: '1' })
      .expect(400);
    const v = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Viewer', email: 'viewer@test.local', password: 'StrongPass123' })
      .expect(201);
    viewerToken = v.body.data.token;
    await request(app).get('/api/projects').expect(401);
  });
  test('project create, list, update and owner checks', async () => {
    const c = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Yamuna Test',
        organization: 'Demo NGO',
        expectedEvidenceCategories: ['Plantation', 'Follow-up'],
      })
      .expect(201);
    projectId = c.body.data._id;
    await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app)
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
    await request(app)
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Nope' })
      .expect(403);
  });
  test('rejects unsupported upload types and invalid media signatures', async () => {
    await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('projectId', projectId)
      .attach('files', Buffer.from('not a pdf upload'), {
        filename: 'file.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('projectId', projectId)
      .attach('files', Buffer.from('not an image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
  });
  test('upload queues analysis and preserves source on provider failure; retry completes', async () => {
    mockedFailAI = true;
    const failed = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('projectId', projectId)
      .attach('files', png, { filename: 'retry.jpg', contentType: 'image/png' })
      .expect(202);
    const id = failed.body.data[0]._id;
    await waitForState(id, 'FAILED');
    expect(await Media.findById(id)).toBeTruthy();
    mockedFailAI = false;
    await request(app)
      .post(`/api/media/${id}/analyze`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(202);
    const completed = await waitForState(id, 'COMPLETED');
    mediaId = String(completed._id);
    expect(completed.aiSummary).toMatch(/plantation/i);
  });
  test('search, compare, timeline, coverage and dashboard return data', async () => {
    const second = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('projectId', projectId)
      .field('evidenceType', 'AFTER')
      .attach('files', png, { filename: 'plant-after.png', contentType: 'image/png' })
      .expect(202);
    await waitForState(second.body.data[0]._id, 'COMPLETED');
    await request(app)
      .get('/api/search')
      .query({ q: 'plantation', projectId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app)
      .post('/api/analysis/compare')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ beforeId: mediaId, afterId: second.body.data[0]._id })
      .expect(200);
    await request(app)
      .get(`/api/projects/${projectId}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const cov = await request(app)
      .get(`/api/projects/${projectId}/coverage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(cov.body.data.gaps.length).toBeGreaterThan(0);
    const dash = await request(app)
      .get(`/api/projects/${projectId}/dashboard`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dash.body.data.totalMedia).toBe(2);
  });
  test('media list exposes delivery URLs and search ranks beyond the first page', async () => {
    const list = await request(app)
      .get('/api/media')
      .query({ projectId, limit: 1 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.data.items[0].thumbnailUrl).toBeTruthy();
    expect(list.body.data.items[0].secureUrl).toBeUndefined();
    const found = await request(app)
      .get('/api/search')
      .query({ q: 'show evidence of plantation', projectId, limit: 1, page: 2 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.total).toBe(2);
    expect(found.body.data.items).toHaveLength(1);
    expect(found.body.data.queryUnderstanding.keywords).toEqual(['plantation']);
    const none = await request(app)
      .get('/api/search')
      .query({ q: 'volcano', projectId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(none.body.data.total).toBe(0);
    await request(app)
      .get('/api/search')
      .query({ q: 'plant(ation', projectId, activity: '((' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
  test('comparisons are returned with media cards', async () => {
    const r = await request(app)
      .get(`/api/projects/${projectId}/comparisons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(r.body.data[0].before.thumbnailUrl).toBeTruthy();
    expect(r.body.data[0].after._id).toBeTruthy();
  });
  test('insight trace and report publish expose sanitized public data', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/insights/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    const insights = await request(app)
      .get(`/api/projects/${projectId}/insights`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app)
      .get(`/api/insights/${insights.body.data[0]._id}/trace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const generated = await request(app)
      .post('/api/reports/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId })
      .expect(201);
    reportId = generated.body.data._id;
    await request(app)
      .get(`/api/reports/${reportId}/pdf`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect('Content-Type', /application\/pdf/)
      .expect(200);
    const pub = await request(app)
      .patch(`/api/reports/${reportId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    const publicReport = await request(app)
      .get(`/api/reports/public/${pub.body.data.publicSlug}`)
      .expect(200);
    expect(JSON.stringify(publicReport.body)).not.toContain('generatedBy');
    const traced = publicReport.body.data.content.traceability[0];
    expect(typeof traced.analyzedAt).toBe('string');
    expect(Number.isNaN(Date.parse(traced.analyzedAt))).toBe(false);
  }, 20000);
  test('browser session cookie authenticates reads and CSRF-guards writes', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'StrongPass123' })
      .expect(200);
    const cookie = login.headers['set-cookie'].find((c) => c.startsWith('token='));
    expect(cookie).toMatch(/HttpOnly/i);
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);
    await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .send({ name: 'CSRF attempt', organization: 'Demo NGO' })
      .expect(403);
    await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ name: 'Cookie project', organization: 'Demo NGO' })
      .expect(201);
    const out = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('X-Requested-With', 'XMLHttpRequest')
      .expect(200);
    expect(out.headers['set-cookie'][0]).toMatch(/token=;/);
  });
  test('successful logins do not consume the auth limiter', async () => {
    for (let i = 0; i < 22; i++)
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.local', password: 'StrongPass123' })
        .expect(200);
  }, 30000);
  test('auth limiter rejects repeated attempts', async () => {
    let response;
    for (let i = 0; i < 25; i++)
      response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.local', password: 'incorrect' });
    expect(response.status).toBe(429);
  });
});
