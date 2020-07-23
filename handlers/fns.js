const {createError} = require('./error');
const https = require('https');
const axios = require('axios');

const rp = require('request-promise');

checkAndReceive = async (req, res, next) => {
  const {
    payload: {
      phone, password
    },
    body: { fn, i, fp, dt, sum },
  } = req;

  let auth;
  try {
    auth =
      'Basic ' + new Buffer(phone.replace(/[ ()-]/g, '') + ':' + password).toString('base64');
  } catch (e) {
    throw new Error('Ошибка получения телефона из БД. Проверьте профиль и/или отчистите кеш приложения и повторите попытку');
  }


  const instance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });


  const getCheck = async () => {
    try {
      return await instance.get(`https://proverkacheka.nalog.ru:9999/v1/ofds/*/inns/*/fss/${fn}/operations/1/tickets/${i}?fiscalSign=${fp}&date=${dt}&sum=${sum}`);
    } catch (e) {
      console.log('getCheck', e.statusCode, e.message);
      switch (e.statusCode) {
        case 406:
          throw new Error('Чек не найден в БД ФНС, возможно чек не валидный. Повторите попытку позже либо введите данные вручную.');
        case 400:
          throw new Error('Не указан параметр дата/сумма. Повторите попытку позже либо введите данные вручную.');
        default:
          throw new Error('Чек некорректен. В случае повторения ошибки вы можете обратиться в ФНС России через оф. приложение "Проверка чека"');
      }
    }
  }

  const getReceipt = async () => {
    try {
      return await instance.get(`https://proverkacheka.nalog.ru:9999/v1/inns/*/kkts/*/fss/${fn}/tickets/${i}?fiscalSign=${fp}&sendToEmail=no`, {
        headers: {
          Authorization: auth,
          'device-id': '',
          'device-os': ''
        },
      })
    } catch (e) {
      console.log('getReceipt', e.statusCode, e.message);
      switch (e.statusCode) {
        case 403:
          throw new Error('Ошибка авторизации на сервере ФНС. Проверьте правильность телефона и/или пароля и повторите попытку.');
        case 400:
          throw new Error('Непредвиденная ошибка на сервере ФНС. Повторите попытку позже либо введите данные вручную.');
        case 500:
          throw new Error('Непредвиденная ошибка на сервере ФНС. Повторите попытку позже либо введите данные вручную.');
        default:
          throw new Error('Чек валидный, но расшифровка не найдена на сервере ФНС. Повторите попытку позже либо введите данные вручную.');
      }
    }
  }

  await getCheck()
    .then(async () => {
      console.log('Чек валидный. Первая попытка расшифровки');
      return await getReceipt()
    })
    .then(async (data) => {
      if (!data.data) {
        console.log('Расшифровка не получена. Вторая попытка', 'data.data', !!data.data);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Отработала выдержка времени');
        return await getReceipt()
      } else {
        console.log('Расшифровка получена. Возвращаем данные', 'data.data', !!data.data);
        return data;
      }
    })
    .then(receipt => {
      try {
        console.log('Получение данных: ');
        const { dateTime, totalSum, items } = receipt.data.document.receipt;
        res.locals.receiptData = { dateTime, totalSum, items };
        next();
      } catch (e) {
        throw new Error('Чек валидный, но расшифровка не найдена на сервере ФНС. Повторите попытку позже либо введите данные вручную.');
      }
    })
    .catch(err => {
      console.log(err);
      next(createError(err.statusCode, err.message))
    });
}
password = async (req, res, next) => {
  const {
    body,
    query: {
      type
    }
  } = req;
  const opt = {
    method: 'POST',
    uri: `https://proverkacheka.nalog.ru:9999/v1/mobile/users/${type}`,
    json: true,
    body,
    resolveWithFullResponse: true,
  };
  await rp(opt)
    .then(() => {
        res.status(200).json({
          message: `На телефон ${body.phone} отправлено сообщение с паролем.`,
        });
      }
    )
    .catch(err => {
      switch (err.statusCode) {
        case 409:
          throw new Error('Пользователь уже существует.');
        case 500:
          throw new Error('Некоректный номер телефона, проверьте правильность и повторите попытку.');
        case 400:
          throw new Error('Некоректный адрес электронной почты, проверьте правильность и повторите попытку.');
        case 404:
          throw new Error('Пользователя не существует.');
        default:
          throw new Error('Непредвиденная ошибка на сервере ФНС. Повторите попытку позже.');
      }
    });
};

const fns = {
  checkAndReceive,
  password
};

module.exports = fns;
