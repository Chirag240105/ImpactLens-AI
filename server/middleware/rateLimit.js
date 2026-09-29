const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');
exports.generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});
exports.strictLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: Math.min(20, config.rateLimitMax),
  standardHeaders: true,
  legacyHeaders: false,
});
