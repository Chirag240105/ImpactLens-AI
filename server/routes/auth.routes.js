const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const c = require('../controllers/api.controller');
const { run } = require('./common');

router.post('/register', authLimiter, [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 128 }),
], validate, run(c.register));
router.post('/login', authLimiter, [body('email').isEmail(), body('password').isString().notEmpty()], validate, run(c.login));
router.get('/me', auth, run(c.me));
router.post('/logout', auth, run(c.logout));

module.exports = router;
