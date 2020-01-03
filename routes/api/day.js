const router = require('express').Router();
const auth = require('../../handlers/auth');
const fns = require('../../handlers/fns');
const {
  getDay,
  getAllDays,
  postDay,
  updateDay,
  postDayByReceipt,
} = require('../../controllers/day');

router.get('/', auth.required, getAllDays);
router.get('/:year/:month/:day', auth.required, getDay);
router.post('/', auth.required, postDay);
router.put('/:year/:month/:day', auth.required, updateDay);
router.post(
  '/receipt',
  auth.required,
  fns.check,
  fns.receive,
  fns.receive,
  postDayByReceipt,
);

module.exports = router;
