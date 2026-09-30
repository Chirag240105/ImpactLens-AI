const svc = require('../services/api.service');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const c = {};
const { config } = require('../config/env');
// Browser sessions use an httpOnly cookie so the JWT never touches JS-readable storage.
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: config.cookieSameSite,
  secure: config.cookieSameSite === 'none' || config.nodeEnv === 'production',
  path: '/',
});
const withSession = (res, data, status = 200) => {
  res.cookie('token', data.token, { ...cookieOptions(), maxAge: config.sessionMaxAgeMs });
  return ok(res, data, {}, status);
};
c.register = async (req, res) => withSession(res, await svc.register(req.body), 201);
c.login = async (req, res) => withSession(res, await svc.login(req.body));
c.me = (req, res) =>
  ok(res, { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role });
c.logout = (req, res) => {
  res.clearCookie('token', cookieOptions());
  return ok(res, { loggedOut: true });
};
c.projects = async (req, res) => ok(res, await svc.listProjects(req.user, req.query));
c.createProject = async (req, res) => ok(res, await svc.createProject(req.body, req.user), {}, 201);
c.getProject = async (req, res) => ok(res, await svc.getProject(req.params.id, req.user));
c.updateProject = async (req, res) =>
  ok(res, await svc.updateProject(req.params.id, req.body, req.user));
c.deleteProject = async (req, res) => ok(res, await svc.deleteProject(req.params.id, req.user));
c.mediaList = async (req, res) => ok(res, await svc.listMedia(req.query, req.user));
c.upload = async (req, res) =>
  ok(res, await svc.upload(req.files || [], req.body, req.user), {}, 202);
c.getMedia = async (req, res) => ok(res, await svc.getMedia(req.params.id, req.user));
c.updateMedia = async (req, res) =>
  ok(res, await svc.updateMedia(req.params.id, req.body, req.user));
c.deleteMedia = async (req, res) => ok(res, await svc.deleteMedia(req.params.id, req.user));
c.retryMedia = async (req, res) => ok(res, await svc.retryMedia(req.params.id, req.user), {}, 202);
c.search = async (req, res) => ok(res, await svc.search(req.query, req.user));
c.compare = async (req, res) => ok(res, await svc.compare(req.body, req.user));
for (const [key, fn] of [
  ['timeline', 'timeline'],
  ['locations', 'locations'],
  ['coverage', 'coverage'],
  ['comparisons', 'comparisons'],
  ['pairs', 'pairs'],
  ['insights', 'insights'],
  ['dashboard', 'dashboard'],
  ['integrity', 'integrity'],
  ['sdgs', 'sdgs'],
])
  c[key] = async (req, res) => ok(res, await svc[fn](req.params.id, req.user));
c.generateInsights = async (req, res) =>
  ok(res, await svc.generateInsights(req.params.id, req.user), {}, 201);
c.trace = async (req, res) => ok(res, await svc.trace(req.params.id, req.user));
c.overview = async (req, res) => ok(res, await svc.overview(req.user));
c.generateReport = async (req, res) =>
  ok(res, await svc.generateReport(req.body, req.user), {}, 201);
c.story = async (req, res) => ok(res, await svc.story(req.body, req.user));
c.campaign = async (req, res) => ok(res, await svc.campaign(req.body, req.user));
c.getReport = async (req, res) => ok(res, await svc.report(req.params.id, req.user));
c.projectReports = async (req, res) =>
  ok(res, await svc.reportByProject(req.params.id, req.user, req.query));
c.publish = async (req, res) => {
  const r = await svc.publish(req.params.id, req.user);
  return ok(res, {
    ...r.toObject(),
    publicUrl: `${config.publicReportBaseUrl}/${r.publicSlug}`,
  });
};
c.publicReport = async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  return ok(res, await svc.publicReport(req.params.slug));
};
c.pdf = async (req, res) => {
  const out = await svc.pdf(req.params.id, req.user);
  res.set('Content-Disposition', `attachment; filename="impactlens-report-${req.params.id}.pdf"`);
  res.type(out.contentType).send(out.content);
};
c.health = (req, res) => ok(res, svc.health());
c.sign = async () => {
  throw new ApiError(
    501,
    'NOT_IMPLEMENTED',
    'Direct upload signing is not enabled; use multipart upload',
  );
};
c.analyzeProject = async (req, res) => {
  const assets = await svc.projectAssets(req.params.id, req.user, {
    processingStatus: { $ne: 'COMPLETED' },
  });
  const { enqueue } = require('../jobs/queue');
  assets.forEach((a) => enqueue(a._id));
  return ok(res, { queued: assets.length }, {}, 202);
};
c.processingStatus = async (req, res) => {
  await svc.getProject(req.params.id, req.user);
  const Media = require('../models/MediaAsset');
  return ok(
    res,
    await Media.aggregate([
      {
        $match: {
          projectId: require('mongoose').Types.ObjectId.createFromHexString(req.params.id),
        },
      },
      { $group: { _id: '$processingStatus', count: { $sum: 1 } } },
    ]),
  );
};
module.exports = c;
