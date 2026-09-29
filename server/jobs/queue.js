const MediaAsset = require('../models/MediaAsset');
const { analyzeMedia } = require('./analyzeMedia.job');
const active = new Set();
const pending = [];
async function enqueue(id) {
  pending.push(String(id));
  drain();
}
function drain() {
  while (pending.length && active.size < 2) {
    const id = pending.shift();
    active.add(id);
    analyzeMedia(id)
      .catch(() => {})
      .finally(() => {
        active.delete(id);
        drain();
      });
  }
}
async function recoverQueue() {
  const docs = await MediaAsset.find({ processingStatus: { $in: ['PENDING', 'PROCESSING'] } })
    .select('_id')
    .lean();
  docs.forEach(({ _id }) => pending.push(String(_id)));
  drain();
}
module.exports = { enqueue, recoverQueue };
