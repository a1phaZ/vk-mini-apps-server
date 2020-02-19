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

router.get('/', requiresLogin, getAllDays);
router.get('/:year/:month/:day', requiresLogin, getDay);
router.post('/', requiresLogin, postDay);
router.put('/:year/:month/:day', requiresLogin, updateDay);
router.post(
  '/receipt',
  requiresLogin,
  fns.check,
  fns.receive,
  fns.receive,
  postDayByReceipt,
);

module.exports = router;
