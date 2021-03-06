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
    return next(createError(422, 'Отсутствует идентификатор пользователя'));
  }

  if (!user.password) {
    return next(createError(422, 'Неверный пароль или пароль отсутствует'));
  } else if (user.password.length !== 4 ) {
    return next(createError(422, 'Неверное кол-во символов пин кода'));
  }

  const finalUser = new User(user);
  finalUser.setPassword(user.password);
  return finalUser
    .save()
    .then(() => {
      res.json({user: finalUser.toAuthJson()});
    })
    .catch(() => {
      next(createError(409, 'Пользователь с данным VK id уже существует.'));
    });
});

router.post('/login', auth.optional, (req, res, next) => {
  const {
    body: { user }
  } = req;

  if (!user.id) {
	  return next(createError(422, 'Отсутствует идентификатор пользователя'));
  }

  if (!user.password) {
    return next(createError(422, 'Неверный пароль или пароль отсутствует'));
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

    return next(createError(400, info.error.message));
  })(req, res, next);
});

router.post('/restore', auth.optional, (req, res, next) => {
  const {
    body: { user: {id, password} }
  } = req;

  if (!id) {
    return next(createError(422, 'Отсутствует идентификатор пользователя'));
  }

  if (!password) {
    return next(createError(422, 'Неверный пароль или пароль отсутствует'));
  } else if (password.length !== 4 ) {
    return next(createError(422, 'Неверное кол-во символов пин кода'));
  }

  User.findOne({id})
    .then(user => {
      if (!user) {
        return next(createError(404, 'Пользователь не найден'));
      }

      user.setPassword(password);
      return user.save()
    })
    .then(data => {
      return res.json({ user: data.toAuthJson() });
    })
    .catch(err => next(err));
});

router.get('/profile', auth.required, (req, res, next) => {
  const {
    payload: { id },
  } = req;

  User.findById(id)
    .then(user => {
      if (!user) {
        return next(createError(404, 'Пользователь не найден'));
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

  if (update.phone) {
    let phone = update.phone;
    phone = phone.replace(/[ ()-]/g, '').replace(/^[8]/g, '+7');
    if (!phone.match(/^\+7\d{10}$/g)) {
      return next(createError(422, 'Ошибка телефона, проверьте введенный телефон'));
    }
  }

  await User.updateOne({_id: id}, {$set: update}, {upsert: true})
    .then(async () => {
      return User.findOne({_id: id});
    })
    .then(async (user) => {
      return await res.json({user: user.toAuthJson()});
    })
    .catch(err => next(err));
});

/**
 * Метод нужен для определения есть ли пользователь в базе
 * если да, то выводим страницу авторизации,
 * если нет, то регистрация
 */
router.get('/find', auth.optional, async (req, res, next) => {
  const {
    query: { id }
  } = req;
  await User.findOne({id})
    .then((user) => {
      if (!user) res.json({result: false, message: 'Пользователь не найден'});
      res.json({result: true, message: 'Пользователь найден'});
    })
    .catch(err => next(err));
});

module.exports = router;
