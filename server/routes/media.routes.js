const router = require('express').Router();
const auth = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimit');
const upload = require('../middleware/upload');
const c = require('../controllers/api.controller');
const { run, projectWrite } = require('./common');

router.post('/sign', auth, projectWrite, strictLimiter, run(c.sign));
router.post('/upload', auth, projectWrite, strictLimiter, upload.parse, upload.magic, run(c.upload));
router.get('/', auth, run(c.mediaList));
router.get('/:id', auth, run(c.getMedia));
router.patch('/:id', auth, projectWrite, run(c.updateMedia));
router.delete('/:id', auth, projectWrite, run(c.deleteMedia));
router.post('/:id/analyze', auth, projectWrite, strictLimiter, run(c.retryMedia));

module.exports = router;
