const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/test', (req, res, next) => {
	return res.status(200).json({
		connection: 'ok',
		message: 'test server'
	})
});
router.use('/api', require('./api'));

module.exports = router;
