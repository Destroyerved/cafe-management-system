const { ZodError } = require('zod');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Already exists' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
