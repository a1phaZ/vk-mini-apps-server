const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const handleError = (err , res) => {
  const { statusCode, status, message } = err;
  res.status(statusCode || status || 500)
  console.log(message);
  res.statusMessage = message;
  res.send({
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
