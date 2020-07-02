const router = require('express').Router();
const fns = require('../../handlers/fns');
const {
  getDays,
  postDay,
  postDayByReceipt,
  editDayItem,
} = require('../../controllers/day');
const auth = require("../../handlers/auth");

router.get('/', auth.required, getDays);
router.post('/', auth.required, postDay);
router.put('/', auth.required, editDayItem);
router.post('/receipt', auth.required, fns.checkAndReceive, postDayByReceipt);

module.exports = router;
