const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();
const { createError } = require('../../handlers/error');
const User = mongoose.model('User');
const requiresLogin = require('../../handlers/requires-login');

router.post('/', (req, res, next) => {
  const {
    body: { user },
  } = req;

  if (!user.id) {
    return next(createError(422, 'id is required'));
  }

  User.authenticate( user.id, function (error, dbUser) {
    if (error) {
      return next(error);
    }

    if (!dbUser) {
      const finalUser = new User(user);
      return finalUser
        .save()
        .then(() => {
          req.session.userId = finalUser._id;
          res.json({user: finalUser.toAuthJson()});
        })
        .catch(err => next(err));
    }

    req.session.userId = dbUser._id;
    return res.status(200).json({ user: dbUser.toAuthJson() });
  });
});

router.get('/profile', requiresLogin, (req, res, next) => {
  const {
    session: { userId },
  } = req;

  User.findById(userId)
    .then(user => {
      if (!user) {
        return res.sendStatus(400);
      }

      return res.json({ user: user.toAuthJson() });
    })
    .catch(err => next(err));
});
//
// router.put('/current', auth.required, async (req, res, next) => {
//   const {
//     payload: { id },
//     body: { update },
//   } = req;
//
//   await User.findOneAndUpdate(id, { $set: update }, { new: true })
//     .then(user => res.json({ user: user.toAuthJson() }))
//     .catch(err => next(err));
// });

module.exports = router;
