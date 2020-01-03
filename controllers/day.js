const Day = require('../models/Day');
const { createError } = require('../handlers/error');

exports.getDay = (req, res, next) => {
  const {
    params: { day, month, year },
    payload: { id },
  } = req;
  const d = prepareDate(day, month, year);
  Day.findOne({ userId: id, dateTime: d })
    .then(day => {
      if (!day) {
        res
          .status(404)
          .json({ message: 'Доходов/раходов в этот день не было' });
      } else {
        res.status(200).json(day);
      }
    })
    .catch(err => next(err));
};

exports.getAllDays = (req, res, next) => {
  const {
    payload: { id },
  } = req;
  Day.find({ userId: id })
    .sort({ dateTime: 1 })
    .then(days => res.status(200).json(days))
    .catch(err => next(err));
};

exports.postDay = async (req, res, next) => {
  const {
    body: { day, month, year, items },
    payload: { id },
  } = req;
  const d = prepareDate(day, month, year);
  await Day.findOne({ userId: id, dateTime: d })
    .then(async day => {
      if (!day) {
        const newDay = new Day({
          userId: id,
          dateTime: d,
          items,
        });
        newDay
          .save()
          .then(day => {
            return res.status(200).json(day);
          })
          .catch(err => next(err));
      } else {
        await Day.updateOne(
          { userId: id, dateTime: d },
          { $push: { items: items } },
        ).then(async () => {
          await Day.findOne({ userId: id, dateTime: d }).then(day => {
            return res.status(200).json(day);
          });
        });
      }
    })
    .catch(err => next(err));
};

exports.updateDay = async (req, res, next) => {
  const {
    params: { day, month, year },
    payload: { id },
    body: { items },
  } = req;
  const d = prepareDate(day, month, year);
  await Day.updateOne({ userId: id, dateTime: d }, { $push: { items: items } })
    .then(async () => {
      await Day.findOne({ userId: id, dateTime: d }).then(day => {
        return res.status(200).json(day);
      });
    })
    .catch(err => next(err));
};

exports.postDayByReceipt = async (req, res, next) => {
  const {
    locals: { receiptData },
  } = res;
  console.log({ receiptData });
  if (receiptData) {
    const {
      body: { fn, fd, fp },
      payload: { id },
    } = req;
    const rex = receiptData.dateTime.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/);
    const d = new Date(rex);
    const receiptToSave = { fn, fd, fp };
    const { dateTime, ...receiptdata } = receiptData;
    const query = { userId: id, dateTime: d };
    await Day.findOne(query)
      .then(async day => {
        if (!day) {
          const newDay = new Day({
            userId: id,
            dateTime: d,
            ...receiptdata,
            receipts: receiptToSave,
          });
          await newDay
            .save()
            .then(item => res.status(200).json(item))
            .catch(err => next(err));
        } else {
          const { items } = receiptdata;
          await Day.findOne(query)
            .then(async day => {
              if (await checkReceipt(day.receipts, receiptToSave)) {
                await Day.updateOne(query, {
                  $push: { items: items, receipts: receiptToSave },
                }).then(async () => {
                  await Day.findOne(query).then(day => {
                    return res.status(200).json(day);
                  });
                });
              } else {
                return next(createError(409, 'Данный чек уже добавлен'));
              }
            })
            .catch(err => next(err));
        }
      })
      .catch(err => next(err));
  } else {
    res.status(404).json({
      message: 'Чек не был найден',
    });
  }
};

prepareDate = (day, month, year) => {
  const sDay = day < 10 ? `0${day}` : day;
  return new Date(`${year}-${month}-${sDay}`);
};

checkReceipt = async (target, obj) => {
  if (target.length !== 0) {
    const [result] = await Promise.all([
      target.some(item => {
        return item.fn !== obj.fn || item.fd !== obj.fd || item.fp !== obj.fp;
      }),
    ]);
    return result;
  }
  return true;
};
