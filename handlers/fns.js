const rp = require('request-promise');

check = async (req, res, next) => {
  console.log('Check receipt');
  const {
    body: { fn, fd, fp, date, sum },
  } = req;
  const uri = `https://proverkacheka.nalog.ru:9999/v1/ofds/*/inns/*/fss/${fn}/operations/1/tickets/${fd}?fiscalSign=${fp}&date=${date}&sum=${sum}`;
  const opt = {
    method: 'GET',
    uri,
    json: true,
    resolveWithFullResponse: true,
  };
  await rp(opt)
    .then(response => {
      res.locals.receiptAvailable = response.statusCode === 204;
      next();
    })
    .catch(err => next(err));
};

receive = async (req, res, next) => {
  console.log('Receive receipt data');
  const {
    locals: { receiptAvailable },
  } = res;
  if (receiptAvailable) {
    const {
      body: { fn, fd, fp },
      payload: { phone, password },
    } = req;
    const uri = `https://proverkacheka.nalog.ru:9999/v1/inns/*/kkts/*/fss/${fn}/tickets/${fd}?fiscalSign=${fp}&sendToEmail=no`;
    const auth =
      'Basic ' + new Buffer(phone + ':' + password).toString('base64');
    const opt = {
      method: 'GET',
      uri,
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
        if (response.body === undefined) {
          next();
        } else if (response.body.document.receipt) {
          const { dateTime, totalSum, items } = response.body.document.receipt;
          res.locals.receiptData = { dateTime, totalSum, items };
          next();
        }
      })
      .catch(err => {
        next(err);
      });
  } else {
    res.locals.receiptData = null;
    next();
  }
};

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
  receive,
  check,
  password
};

module.exports = fns;
