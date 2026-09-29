const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');
const base = { windowMs: config.rateLimitWindowMs, standardHeaders: true, legacyHeaders: false };
exports.generalLimiter = rateLimit({ ...base, limit: config.rateLimitMax });
// Brute-force guard for login/register: only failed attempts count toward the limit.
exports.authLimiter = rateLimit({
  ...base,
  limit: Math.min(20, config.rateLimitMax),
  skipSuccessfulRequests: true,
});
// Expensive actions (uploads, AI analysis, generation) get their own budget so normal
// demo usage doesn't exhaust the auth limiter's counter.
exports.actionLimiter = rateLimit({ ...base, limit: config.rateLimitActionMax });
// Backwards-compatible alias.
exports.strictLimiter = exports.actionLimiter;
