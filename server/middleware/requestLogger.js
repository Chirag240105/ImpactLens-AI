const logger = require('../utils/logger');
module.exports = (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () =>
    logger.info(
      {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      },
      'http request',
    ),
  );
  next();
};
