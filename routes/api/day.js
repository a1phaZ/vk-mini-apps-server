const router = require('express').Router();
const fns = require('../../handlers/fns');
const {
  getDays,
  postDay,
  postDayByReceipt,
} = require('../../controllers/day');
const auth = require("../../handlers/auth");

router.get('/', auth.required, getDays);
router.post('/', auth.required, postDay);
router.post('/receipt', auth.optional, fns.checkAndReceive, postDayByReceipt);

module.exports = router;
