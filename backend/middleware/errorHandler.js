const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' && statusCode >= 500
      ? 'Internal Server Error'
      : (err.message || 'Internal Server Error'),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
