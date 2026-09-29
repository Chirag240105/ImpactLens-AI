const router = require('express').Router();
const auth = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimit');
const c = require('../controllers/api.controller');
const { run, projectWrite } = require('./common');

router.post('/generate', auth, projectWrite, strictLimiter, run(c.generateReport));
router.post('/story', auth, projectWrite, run(c.story));
router.post('/campaign', auth, projectWrite, run(c.campaign));
router.get('/public/:slug', run(c.publicReport));
router.get('/:id/pdf', auth, run(c.pdf));
router.patch('/:id/publish', auth, projectWrite, run(c.publish));
router.get('/:id', auth, run(c.getReport));

module.exports = router;
