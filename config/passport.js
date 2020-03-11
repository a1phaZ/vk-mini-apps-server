const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/User');
const { createError } = require('../handlers/error');

passport.use(
  new LocalStrategy(
    {
      usernameField: 'user[id]',
      passwordField: 'user[password]'
    },
    (id, password, done) => {
      User.findOne({ id: id })
        .then(user => {
          if (!user || !user.validatePassword(password)) {
            return done(createError(404, 'Пользователь не найден или пароль неверный'));
          }
          return done(null, user);
        })
        .catch(err => done(err));
    },
  ),
);
