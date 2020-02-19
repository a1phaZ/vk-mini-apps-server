const {createError} = require("./error");
const requiresLogin = (req, res, next) => {
	if (req.session && req.session.userId) {
		return next();
	} else {
		next(createError(401, 'You must be logged in to view this page.'));
	}
};

module.exports = requiresLogin;
