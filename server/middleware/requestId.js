const { randomUUID } = require('crypto');
exports.requestId = (req, res, next) => {
  req.id = req.get('x-request-id') || randomUUID();
  res.set('x-request-id', req.id);
  next();
};
