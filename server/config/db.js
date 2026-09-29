const mongoose = require('mongoose');
const { config } = require('./env');
async function connect() {
  await mongoose.connect(config.mongodbUri);
}
async function disconnect() {
  await mongoose.disconnect();
}
module.exports = { connect, disconnect };
