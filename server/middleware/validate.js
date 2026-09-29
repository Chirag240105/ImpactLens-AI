const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(
      new ApiError(
        400,
        'VALIDATION_ERROR',
        'Request validation failed',
        errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
      ),
    );
  next();
};
