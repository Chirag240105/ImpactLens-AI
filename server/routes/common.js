const wrap = require('../utils/asyncHandler');
const role = require('../middleware/roles');

module.exports = {
  run: (handler) => wrap(handler),
  projectWrite: role('ADMIN', 'PROJECT_MANAGER'),
};
