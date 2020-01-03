const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const handleError = (err, res) => {
  const { statusCode, message } = err;
  res.status(statusCode).json({
    error: {
      status: 'error',
      statusCode,
      message,
    },
  });
};

module.exports = {
  createError,
  handleError,
};
