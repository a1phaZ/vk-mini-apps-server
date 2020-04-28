const router = require('express').Router();
const fns = require('../../handlers/fns');
const {
  getDay,
  getDays,
  postDay,
  updateDay,
  postDayByReceipt,
} = require('../../controllers/day');
const auth = require("../../handlers/auth");

router.get('/', auth.required, getDays);
router.get('/:year/:month/:day', auth.required, getDay);
router.post('/', auth.required, postDay);
router.put('/:year/:month/:day', auth.required, updateDay);
router.post('/receipt', auth.optional, fns.checkAndReceive, postDayByReceipt);

module.exports = router;
