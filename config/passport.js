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
      User.findOne({ id: id })
        .then(user => {
          if (!user || !user.validatePassword(password)) {
            return done(null, false, { error: { status: 'Ошибка авторизации', message: 'В базе данных нет запрашиваемой комбинации пользователь/пароль. Возможно вы не зарегистрированы.'}});
          }
          return done(null, user);
        })
        .catch(err => done(err));
    },
  ),
);
