const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { generalLimiter, strictLimiter } = require('../middleware/rateLimit');
const c = require('../controllers/api.controller');
const { run, projectWrite } = require('./common');

router.get('/', auth, generalLimiter, run(c.projects));
router.post('/', auth, projectWrite, [
  body('name').isString().trim().isLength({ min: 2, max: 160 }),
  body('organization').isString().trim().notEmpty(),
], validate, run(c.createProject));
router.get('/:id', auth, run(c.getProject));
router.patch('/:id', auth, projectWrite, run(c.updateProject));
router.delete('/:id', auth, projectWrite, run(c.deleteProject));
router.post('/:id/analyze', auth, projectWrite, strictLimiter, run(c.analyzeProject));
router.get('/:id/processing-status', auth, run(c.processingStatus));
router.get('/:id/dashboard', auth, run(c.dashboard));
router.get('/:id/timeline', auth, run(c.timeline));
router.get('/:id/locations', auth, run(c.locations));
router.get('/:id/coverage', auth, run(c.coverage));
router.get('/:id/integrity', auth, run(c.integrity));
router.get('/:id/sdgs', auth, run(c.sdgs));
router.get('/:id/comparisons', auth, run(c.comparisons));
router.get('/:id/pair-suggestions', auth, run(c.pairs));
router.get('/:id/insights', auth, run(c.insights));
router.post('/:id/insights/generate', auth, projectWrite, strictLimiter, run(c.generateInsights));
router.get('/:id/reports', auth, run(c.projectReports));

module.exports = router;
