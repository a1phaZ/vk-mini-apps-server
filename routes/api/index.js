const express = require('express');
const router = express.Router();

router.use('/users', require('./users'));
router.use('/day', require('./day'));
router.use('/fns', require('./fns'));

module.exports = router;
