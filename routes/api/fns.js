const auth = require("../../handlers/auth");
const router = require('express').Router();
const { password } = require('../../handlers/fns');

router.post('/password', auth.required, password);

module.exports = router;
