const passThrough = (req, res, next) => next();

module.exports = {
  apiLimiter: passThrough,
  authLimiter: passThrough,
  loginLimiter: passThrough,
  saveLimiter: passThrough,
  generateLimiter: passThrough
};
