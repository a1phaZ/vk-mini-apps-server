const router = require('express').Router();
const auth = require('../../handlers/auth');
const { register, restorePassword } = require('../../handlers/fns');

router.get('/register', auth.required, register);
router.get('/restore', auth.required, restorePassword);

module.exports = router;
