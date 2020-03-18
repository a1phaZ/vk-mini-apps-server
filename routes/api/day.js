const router = require('express').Router();
const fns = require('../../handlers/fns');
const {
  getDay,
  getAllDays,
  postDay,
  updateDay,
  postDayByReceipt,
} = require('../../controllers/day');
const requiresLogin = require('../../handlers/requires-login');
const auth = require("../../handlers/auth");

router.get('/', auth.required, getAllDays);
router.get('/:year/:month/:day', auth.required, getDay);
router.post('/', auth.required, postDay);
router.put('/:year/:month/:day', auth.required, updateDay);
router.post(
  '/receipt',
  requiresLogin,
  fns.check,
  fns.receive,
  fns.receive,
  postDayByReceipt,
);

module.exports = router;
