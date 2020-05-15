const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const handleError = (err , res) => {
  const { statusCode, status, message } = err;
  res.status(statusCode || status || 500).send({
    error: {
      status: 'error',
      statusCode,
      statusMessage: message,
    },
  });
};

module.exports = {
  createError,
  handleError,
};
