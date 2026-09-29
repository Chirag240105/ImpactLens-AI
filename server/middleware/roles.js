const ApiError = require('../utils/ApiError');
module.exports =
  (...roles) =>
  (req, res, next) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new ApiError(403, 'FORBIDDEN', 'Insufficient role'));
