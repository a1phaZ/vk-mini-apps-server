const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();
const auth = require('../../handlers/auth');
const { createError } = require('../../handlers/error');
const User = mongoose.model('User');

router.post('/', auth.optional, (req, res, next) => {
  const {
    body: { user },
  } = req;

  if (!user.id) {
    return next(createError(422, 'id is required'));
  }

  const finalUser = new User(user);

  return finalUser
    .save()
    .then(() => res.json({ user: finalUser.toAuthJson() }))
    .catch(err => next(err));
});

router.post('/login', auth.optional, (req, res, next) => {
  const {
    body: { user },
  } = req;

  if (!user.id) {
    return next(createError(422, 'id is required'));
  }

  return passport.authenticate(
    'local',
    { session: false },
    (err, passportUser) => {
      if (err) {
        return next(err);
      }

      if (passportUser) {
        const user = passportUser;
        user.token = passportUser.generateJWT();
        return res.status(200).json({ user: user.toAuthJson() });
      }
    },
  )(req, res, next);
});

router.get('/current', auth.required, (req, res) => {
  const {
    payload: { id },
  } = req;

  return User.findById(id)
    .then(user => {
      if (!user) {
        return res.sendStatus(400);
      }

      return res.json({ user: user.toAuthJson() });
    })
    .catch(err => next(err));
});

router.put('/current', auth.required, async (req, res, next) => {
  const {
    payload: { id },
    body: { update },
  } = req;

  await User.findOneAndUpdate(id, { $set: update }, { new: true })
    .then(user => res.json({ user: user.toAuthJson() }))
    .catch(err => next(err));
});

module.exports = router;
