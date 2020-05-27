const {createError} = require('./error');
const https = require('https');
const axios = require('axios');

const rp = require('request-promise');

// test = async (req, res, next) => {
//   const {
//     payload: {
//       phone, password
//     },
//     body: { fn, i, fp, dt, sum },
//     query: { action }
//   } = req;
//   // Вывод ошибки с предложением авторизоваться снова
//
//   let opt = {};
//   switch (action) {
//     case 'check':
//       opt = {
//         method: 'GET',
//         uri: `https://proverkacheka.nalog.ru:9999/v1/ofds/*/inns/*/fss/${fn}/operations/1/tickets/${i}?fiscalSign=${fp}&date=${dt}&sum=${sum}`,
//         json: true,
//         resolveWithFullResponse: true,
//       };
//       await rp(opt)
//         .then(response => {
//           // res.locals.receiptAvailable = response.statusCode === 204;
//           const {statusCode} = response;
//           // console.log('check', {statusCode, body, phone, password, fn, i, fp, dt, sum});
//           res.status(200).json({
//             statusCode: statusCode,
//             check: true
//           });
//         })
//         .catch(err => {
//           // console.log('check error', err);
//           // res.status(err.statusCode || 200).json(err);
//           return next(createError(err.statusCode, err.message));
//         });
//       break;
//     case 'receive':
//       const auth =
//         'Basic ' + new Buffer(phone.replace(/[ ()-]/g, '') + ':' + password).toString('base64');
//       opt = {
//         method: 'GET',
//         uri: `https://proverkacheka.nalog.ru:9999/v1/inns/*/kkts/*/fss/${fn}/tickets/${i}?fiscalSign=${fp}&sendToEmail=no`,
//         json: true,
//         resolveWithFullResponse: true,
//         headers: {
//           Authorization: auth,
//           'device-id': '',
//           'device-os': '',
//         },
//       };
//
//       await rp(opt)
//         .then(response => {
//           const {statusCode, body} = response;
//           // console.log('receive', {statusCode, body, phone, password, fn, i, fp, dt, sum});
//           if (!body) {
//             res.status(200).json({
//               check: true,
//               statusCode: statusCode,
//               body: false
//             });
//           } else if (body.document.receipt) {
//             const { dateTime, totalSum, items } = body.document.receipt;
//             res.locals.receiptData = { dateTime, totalSum, items };
//             next();
//           }
//         })
//         .catch(err => {
//           // console.log('receive error', err);
//           // const error = createError(err.statusCode, err.message);
//           // console.log('receive error', error);
//           // res.status(err.statusCode || 200).json(error);
//           return next(createError(err.statusCode, err.message));
//         });
//       break;
//     default:
//       next();
//       break;
//   }
// }

checkAndReceive = async (req, res, next) => {
  const {
    payload: {
      phone, password
    },
    body: { fn, i, fp, dt, sum },
  } = req;

  const auth =
    'Basic ' + new Buffer(phone.replace(/[ ()-]/g, '') + ':' + password).toString('base64');

  const instance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });


  const getCheck = async () => {
    try {
      return await instance.get(`https://proverkacheka.nalog.ru:9999/v1/ofds/*/inns/*/fss/${fn}/operations/1/tickets/${i}?fiscalSign=${fp}&date=${dt}&sum=${sum}`);
    } catch (e) {
      switch (e.statusCode) {
        case 406:
          throw new Error('Чек не найден в БД ФНС, возможно чек не валидный. Повторите попытку позже либо ввелите данные вручную.');
        case 400:
          throw new Error('Не указан параметр дата/сумма. Повторите попытку позже либо ввелите данные вручную.');
        default:
          throw new Error(e);
      }
    }
  }

  const getReceipt = async () => {
    try {
      return await instance.get(`https://proverkacheka.nalog.ru:9999/v1/inns/*/kkts/*/fss/${fn}/tickets/${i}?fiscalSign=${fp}&sendToEmail=no`, {
        headers: {
          Authorization: auth,
          'device-id': '',
          'device-os': '',
        },
      })
    } catch (e) {
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
      return await getReceipt()
    })
    .then(async (data) => {
      if (!data.data) {
        return await getReceipt();
      } else {
        return data;
      }
    })
    .then(async receipt => {
      const { dateTime, totalSum, items } = await receipt.data.document.receipt;
      res.locals.receiptData = { dateTime, totalSum, items };
      next();
    })
    .catch(err => {
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
          return next(createError(err.statusCode, 'Пользователь уже существует.'));
        case 500:
          return next(createError(err.statusCode, 'Некоректный номер телефона, проверьте правильность и повторите попытку.'));
        case 400:
          return next(createError(err.statusCode, 'Некоректный адрес электронной почты, проверьте правильность и повторите попытку.'));
        case 404:
          return next(createError(err.statusCode, 'Пользователя не существует.'));
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
