const router = require('express').Router();
const { register, restorePassword } = require('../../handlers/fns');
const requiresLogin = require('../../handlers/requires-login');

router.get('/register', requiresLogin, register);
router.get('/restore', requiresLogin, restorePassword);

module.exports = router;
