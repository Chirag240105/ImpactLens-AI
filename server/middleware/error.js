const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');
exports.errorHandler = (err, req, res, _next) => {
  const status =
    err.name === 'MulterError'
      ? 400
      : err instanceof ApiError
        ? err.status
        : err.name === 'ValidationError'
          ? 400
          : err.name === 'CastError'
            ? 400
            : err.code === 11000
              ? 409
              : 500;
  const code =
    err.name === 'MulterError'
      ? 'UPLOAD_ERROR'
      : err instanceof ApiError
        ? err.code
        : status === 500
          ? 'INTERNAL_ERROR'
          : 'VALIDATION_ERROR';
  const message =
    status === 500 && config.nodeEnv === 'production' ? 'Internal server error' : err.message;
  res.status(status).json({ success: false, error: { code, message, details: err.details || [] } });
};
