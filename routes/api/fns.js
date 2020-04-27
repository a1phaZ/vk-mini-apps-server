const auth = require("../../handlers/auth");
const router = require('express').Router();
const { register, restorePassword, password } = require('../../handlers/fns');

router.get('/register', auth.required, register);
router.get('/restore', auth.required, restorePassword);
router.post('/password', auth.required, password);

module.exports = router;
