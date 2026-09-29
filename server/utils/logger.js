const pino = require('pino');
const { config } = require('../config/env');
module.exports = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  redact: ['*.password', '*.passwordHash', '*.token', '*.authorization', '*.apiKey', '*.apiSecret'],
});
