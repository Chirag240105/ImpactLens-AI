const router = require('express').Router();
const { run } = require('./common');
const c = require('../controllers/api.controller');

router.get('/health', run(c.health));
router.use('/auth', require('./auth.routes'));
router.use('/projects', require('./projects.routes'));
router.use('/media', require('./media.routes'));
const insights = require('./insights.routes');
router.use('/search', insights.search);
router.use('/analysis', insights.analysis);
router.use('/insights', insights.trace);
router.get('/dashboard/overview', require('../middleware/auth'), run(c.overview));
router.use('/reports', require('./reports.routes'));

module.exports = router;
