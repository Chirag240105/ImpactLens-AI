const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { config } = require('./config/env');
const { requestId } = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/error');
const routes = require('./routes');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(requestId);
app.use(requestLogger);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(mongoSanitize());
app.use('/api', routes);
app.use((req, res) =>
  res
    .status(404)
    .json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }),
);
app.use(errorHandler);
module.exports = app;
