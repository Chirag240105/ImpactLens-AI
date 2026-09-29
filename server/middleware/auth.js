const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');
module.exports = async (req, res, next) => {
  try {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '') || req.cookies?.token;
    if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(payload.sub).select('-passwordHash');
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Invalid session');
    next();
  } catch (err) {
    next(
      err instanceof ApiError ? err : new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token'),
    );
  }
};
