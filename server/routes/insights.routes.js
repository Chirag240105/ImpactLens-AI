const router = require('express').Router();
const analysisRouter = require('express').Router();
const traceRouter = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/api.controller');
const { run } = require('./common');

router.get('/', auth, run(c.search));
analysisRouter.post('/compare', auth, run(c.compare));
traceRouter.get('/:id/trace', auth, run(c.trace));

module.exports = { search: router, analysis: analysisRouter, trace: traceRouter };
