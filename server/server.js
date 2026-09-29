const app = require('./app');
const { config } = require('./config/env');
const { connect, disconnect } = require('./config/db');
const { recoverQueue } = require('./jobs/queue');
const logger = require('./utils/logger');

async function start() {
  await connect();
  await recoverQueue();
  const server = app.listen(config.port, () =>
    logger.info({ port: config.port }, 'ImpactLens API ready'),
  );
  const shutdown = async () => {
    server.close(async () => {
      await disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}
if (require.main === module)
  start().catch((err) => {
    logger.error({ err: err.message }, 'Startup failed');
    process.exit(1);
  });
module.exports = { start };
