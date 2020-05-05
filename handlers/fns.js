const rp = require('request-promise');

checkAndReceive = async (req, res, next) => {
  const {
    payload: {
      phone, password
    },
    body: { fn, i, fp, dt, sum },
    query: { action }
  } = req;
  //TODO Добавить проверку phone и password, если токен истек
  // Вывод ошибки с предложением авторизоваться снова
  let opt = {};
  switch (action) {
    case 'check':
      opt = {
        method: 'GET',
        uri: `https://proverkacheka.nalog.ru:9999/v1/ofds/*/inns/*/fss/${fn}/operations/1/tickets/${i}?fiscalSign=${fp}&date=${dt}&sum=${sum}`,
        json: true,
        resolveWithFullResponse: true,
      };
      await rp(opt)
        .then(response => {
          // res.locals.receiptAvailable = response.statusCode === 204;
          res.status(200).json({
            statusCode: response.statusCode,
            check: true
          });
        })
        .catch(err => {
          next(err)
        });
      break;
    case 'receive':
      const auth =
        'Basic ' + new Buffer(phone.replace(/[ ()-]/g, '') + ':' + password).toString('base64');
      opt = {
        method: 'GET',
        uri: `https://proverkacheka.nalog.ru:9999/v1/inns/*/kkts/*/fss/${fn}/tickets/${i}?fiscalSign=${fp}&sendToEmail=no`,
        json: true,
        resolveWithFullResponse: true,
        headers: {
          Authorization: auth,
          'device-id': '',
          'device-os': '',
        },
      };

      await rp(opt)
        .then(response => {
          if (!response.body) {
            res.status(200).json({
              check: true,
              statusCode: response.statusCode,
              body: false
            });
          } else if (response.body.document.receipt) {
            const { dateTime, totalSum, items } = response.body.document.receipt;
            res.locals.receiptData = { dateTime, totalSum, items };
            next();
          }
        })
        .catch(err => {
          next(err);
        });
      break;
    default:
      next();
      break;
  }
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
          message: `На телефон ${body.phone} отправлено сообщение с паролем`,
        });
      }
    )
    .catch(err => {
      //TODO обработка ошибок
      next(err)
    });
};

const fns = {
  checkAndReceive,
  password
};

module.exports = fns;
