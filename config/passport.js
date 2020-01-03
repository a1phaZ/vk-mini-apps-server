const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/User');
const { createError } = require('../handlers/error');

passport.use(
  new LocalStrategy(
    {
      usernameField: 'user[email]',
      passwordField: 'user[password]',
    },
    (email, password, done) => {
      User.findOne({ email: email.toLowerCase() })
        .then(user => {
          if (!user || !user.validatePassword(password)) {
            return done(createError(403, 'Неверный email или пароль'));
          }
          return done(null, user);
        })
        .catch(err => done(err));
    },
  ),
);
