const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();
const { createError } = require('../../handlers/error');
const User = mongoose.model('User');
const auth = require("../../handlers/auth");

router.post('/register', auth.optional, (req, res, next) => {
  const {
    body: { user },
  } = req;

  if (!user.id) {
    return next(createError(422, 'id is required'));
  }

  if (!user.password) {
    return next(createError(422, 'password is required'));
  }

  const finalUser = new User(user);
  finalUser.setPassword(user.password);
  return finalUser
    .save()
    .then(() => {
      res.json({user: finalUser.toAuthJson()});
    })
    .catch(err => {
      next(err);
    });
});

router.post('/login', auth.optional, (req, res, next) => {
  const {
    body: { user }
  } = req;

  if (!user.id) {
    return next(createError(422, 'id is required'));
  }

  if (!user.password) {
    return next(createError(422, 'password is required'));
  }

  return passport.authenticate('local', {session: false}, (err, passportUser, info)=> {
    if(err) {
      return next(err);
    }

    if (passportUser) {
      const user = passportUser;
      user.token = passportUser.generateJWT();

      return res.json({ user: user.toAuthJson() });
    }

    console.log(info);

    return res.status(400).json(info);
  })(req, res, next);
});

router.get('/profile', auth.required, (req, res, next) => {
  const {
    payload: { id },
  } = req;

  User.findById(id)
    .then(user => {
      if (!user) {
        return res.sendStatus(400);
      }

      return res.json({ user: user.toAuthJson() });
    })
    .catch(err => next(err));
});

router.put('/profile', auth.required, async (req, res, next) => {
  const {
    payload: { id },
    body: { update },
  } = req;

  await User.findOneAndUpdate({_id: id}, { $set: update }, { new: true })
    .then(user => res.json({ user: user.toAuthJson() }))
    .catch(err => next(err));
});

module.exports = router;
