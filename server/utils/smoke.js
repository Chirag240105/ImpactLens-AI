const { config } = require('../config/env');
const base = `http://localhost:${config.port}/api`;
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=',
  'base64',
);
async function main() {
  const passed = [];
  const request = async (method, path, body, token) => {
    const r = await fetch(base + path, {
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body } : {}),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(`${method} ${path}: ${json.error?.message || r.status}`);
    return json.data;
  };
  const step = (name) => {
    passed.push(name);
    console.log(`PASS ${name}`);
  };
  try {
    const login = await request(
      'POST',
      '/auth/login',
      JSON.stringify({ email: 'manager@impactlens.demo', password: 'Manager123!' }),
    );
    // Login requires JSON content type, supplied here explicitly.
    const token = login.token;
    step('login');
    const projects = await request('GET', '/projects', null, token);
    const project = projects.items[0];
    if (!project) throw new Error('No seeded project; run npm run seed');
    step('project');
    const form = new FormData();
    form.append('projectId', project._id);
    form.append('evidenceType', 'FIELD_EVIDENCE');
    form.append('files', new Blob([png], { type: 'image/png' }), 'smoke-field.png');
    const uploaded = await request('POST', '/media/upload', form, token);
    const asset = uploaded[0];
    step('upload');
    await request('POST', `/media/${asset._id}/analyze`, null, token);
    let status = 'PENDING';
    for (let i = 0; i < 20 && status !== 'COMPLETED'; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const detail = await request('GET', `/media/${asset._id}`, null, token);
      status = detail.processingStatus;
    }
    if (status !== 'COMPLETED') throw new Error('Uploaded asset did not complete analysis');
    step('analyze');
    await request('GET', `/search?q=field&projectId=${project._id}`, null, token);
    step('search');
    const all = await request('GET', `/media?projectId=${project._id}&limit=100`, null, token);
    const before = all.items.find((x) => x.evidenceType === 'BEFORE');
    const after = all.items.find((x) => x.evidenceType === 'AFTER');
    if (!before || !after) throw new Error('Seeded project needs before and after assets');
    await request(
      'POST',
      '/analysis/compare',
      JSON.stringify({ beforeId: before._id, afterId: after._id }),
      token,
    );
    step('compare');
    await request('POST', `/projects/${project._id}/insights/generate`, null, token);
    step('insights');
    const report = await request(
      'POST',
      '/reports/generate',
      JSON.stringify({ projectId: project._id }),
      token,
    );
    step('report');
    const published = await request(
      'PATCH',
      `/reports/${report._id}/publish`,
      JSON.stringify({}),
      token,
    );
    await request('GET', `/reports/public/${published.publicSlug}`);
    step('public report');
  } catch (err) {
    console.error(`FAIL ${err.message}`);
    process.exitCode = 1;
  }
}
// JSON requests need the explicit media type while FormData must set its own boundary.
const nativeFetch = global.fetch;
global.fetch = (url, options = {}) => {
  if (typeof options.body === 'string')
    options.headers = { ...options.headers, 'content-type': 'application/json' };
  return nativeFetch(url, options);
};
main();
