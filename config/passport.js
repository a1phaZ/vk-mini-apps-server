const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/User');

passport.use(
  new LocalStrategy(
    {
      usernameField: 'user[id]',
      passwordField: 'user[password]'
    },
    (id, password, done) => {
      console.log({id, password});
      User.findOne({ id: id })
        .then(user => {
          if (!user || !user.validatePassword(password)) {
            return done(null, false, { errors: { 'email or password' : 'is invalid'}});
          }
          return done(null, user);
        })
        .catch(err => done(err));
    },
  ),
);
