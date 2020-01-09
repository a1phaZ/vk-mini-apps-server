const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/User');
const { createError } = require('../handlers/error');

passport.use(
  new LocalStrategy(
    {
      usernameField: 'user[id]',
    },
    (id, done) => {
      User.findOne({ vk_id: id })
        .then(user => {
          if (!user) {
            return done(createError(404, 'Пользователь не найден'));
          }
          return done(null, user);
        })
        .catch(err => done(err));
    },
  ),
);
