const Day = require('../models/Day');
const Catalog = require('../models/Catalog');
const { createError } = require('../handlers/error');

exports.getDays = async (req, res, next) => {
  const {
    payload: { id },
    query,
  } = req;
  const dateRange = prepareDateRange(query.date);
  await Day.find({
    userId: id,
    dateTime: {$gte: dateRange.startDate, $lte: dateRange.endDate}
  })
    .sort({ dateTime: -1 })
    .populate({path: 'items.definition', select: 'definition'})
    .then(days => {
      return res.status(200).json(days)
    })
    .catch(() => {
      next(createError(500, 'Ошибка со стороны базы данных'))
    });
};

exports.postDay = async (req, res, next) => {
  const {
    body: { date, items },
    payload: { id },
  } = req;
  await Day.findOne({ userId: id, dateTime: date })
    .then(async day => {
      if (!day) {
        const newDay = new Day({
          userId: id,
          dateTime: date,
          items: items,
        });
        newDay
          .save()
          .then(day => {
            return res.status(200).json(day);
          })
          .catch(err => {
            console.log(err);
            next(err)
          });
      } else {
        await Day.updateOne(
          { userId: id, dateTime: date },
          { $set: { items: [...day.items, ...items] } },
        ).then(async () => {
          await Day.findOne({ userId: id, dateTime: date }).then(day => {
            return res.status(200).json(day);
          });
        });
      }
    })
    .catch(err => {
      console.log(err);
      next(err)
    });
};

exports.postDayByReceipt = async (req, res, next) => {
  const {
    locals: { receiptData },
  } = res;
  if (receiptData) {
    const {
      body: { fn, i, fp },
      payload: { id },
    } = req;
    const rex = receiptData.dateTime.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/);
    const d = new Date(rex);
    const receiptToSave = { fn, i, fp };
    const { dateTime, ...receiptdata } = receiptData;
    const query = { userId: id, dateTime: d };
    await Day.findOne(query)
      .then(async day => {
        if (!day) {
          const newDay = new Day({
            userId: id,
            dateTime: d,
            items: receiptdata.items,
            receipts: receiptToSave,
          });
          return await newDay
            .save()
            .then(item => res.status(200).json(item))
            .catch(err => next(err));
        } else {
          const { items } = receiptdata;
          if (await checkReceipt(day.receipts, receiptToSave)) {
            await Day.updateOne(query, {
              $set: { items: [...day.items, ...items], receipts: [...day.receipts, receiptToSave] },
            })
              .then(async () => {
                await Day.findOne(query).then(day => {
                  return res.status(200).json(day);
                });
              })
              .catch(err => {
                console.log(err);
                next(err)
              });
          } else {
            return next(createError(409, 'Данный чек уже добавлен'));
          }
        }
      })
      .catch(err => {
        console.log(err);
        next(err)
      });
  } else {
    await res.status(404).json({
      message: 'Чек не был найден',
    });
  }
};

exports.editDayItem = async (req, res, next) => {
  const {
    body,
    payload: {id}
  } = req;
  const [editedItem] = body.items;
  await Day.findOne({
      userId: id,
      'items._id': body.id
    })
    .then(day => {
      return day.items;
    })
    .then(items => {
      const array = [...items];
      const index = array.findIndex((item) => {
        return item._id.toString() === body.id.toString()
      });
      array[index] = {...editedItem}
      return array;
    })
    .then(async (array) => {
      // console.log(array);
      return updateDayElement(id, body.id, array);
    })
    .then((updatedDay) => {
      res.status(200).json(updatedDay);
    })
    .catch(err => {
      console.log(err);
      next(err)
    });
}

exports.deleteDayItem = async (req, res, next) => {
  const {
    body,
    payload: {id}
  } = req;
  await Day.findOne({
    userId: id,
    'items._id': body.id
  })
    .then(day => day.items)
    .then(items => {
      const array = [...items];
      array.splice(array.findIndex((item) => {
        return item._id.toString() === body.id.toString()
      }), 1);
      return array;
    })
    .then(async array => {
      if (array.length !== 0) {
        return updateDayElement(id, body.id, array);
      }
      return Day.deleteOne({
        userId: id,
        'items._id': body.id
      })
    })
    .then((updatedDay) => {
      res.status(200).json(updatedDay);
    })
    .catch(err => next(err));
}

// {
//   date: '2020-07-02',
//     items: [
//       {
//         name: 'Остаток',
//         quantity: '12',
//         price: 10000000,
//         sum: 120000000,
//         income: true,
//         modifiers: [],
//         properties: [],
//         canDelete: true,
//         canEditDate: true
//       }
//     ],
//   id: '5efd4c6a2403642ebc5155ec'
// }
/**
 * Обновление документа при изменении/удалении элементов
 * @param {string} userId
 * @param {string} id
 * @param {[]} array
 * @returns {Promise<*>}
 * @private
 */
const updateDayElement = async (userId, id, array) => {
  return await Day.updateOne({
    userId: userId,
    'items._id': id
  }, { $set: {items: array}}, { new: true })
}

prepareDate = (day, month, year) => {
  const sDay = day < 10 ? `0${day}` : day;
  return new Date(`${year}-${month}-${sDay}`);
};

checkReceipt = async (target, obj) => {
  if (target.length !== 0) {
    const [result] = await Promise.all([
      target.some(item => {
        return item.fn === obj.fn && item.i === obj.i && item.fp === obj.fp;
      }),
    ]);
    return !result;
  }
  return true;
};

writeItemsFromCatalog = async (array, id) => {
  const mappedArray = await array.map(async (item) => {
    await Catalog.updateOne({userId: id, name: item.name}, { $set: {name: item.name} }, {upsert: true})
    const cItem = await Catalog.findOne({userId: id, name: item.name});
    item.definition = cItem && cItem._id;
    return item;
  })
  return await Promise.allSettled(mappedArray).then(res => res);
}

prepareDateRange = (date) => {
  const currentDate = new Date(date);
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth());
  //
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0);

  return {
    startDate,
    endDate
  }
};
