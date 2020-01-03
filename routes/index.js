const express = require('express');
const router = express.Router();

/* GET home page. */
router.use('/api', require('./api'));

module.exports = router;
