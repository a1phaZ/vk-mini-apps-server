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
          items: await writeItemsFromCatalog([...items], id).then(res => res.map((item => {
            return item.value;
          }))),
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
        const array = await writeItemsFromCatalog([...day.items, ...items], id).then(res => res.map((item => {
          return item.value;
        })));

        // await Day.findOneAndUpdate({ userId: id, dateTime: date }, {items: array})
        await Day.updateOne(
          { userId: id, dateTime: date },
          { $set: { items: array } },
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
          await writeItemsFromCatalog(receiptdata.items, id)
            .then(res => res.map((item => item.value)))
            .then(async items => {
              const newDay = new Day({
                userId: id,
                dateTime: d,
                items: items,
                receipts: receiptToSave,
              });
              return await newDay
                .save()
                .then(item => res.status(200).json(item))
            })
            .catch(err => next(err));

        } else {
          const { items } = receiptdata;
          // await Day.findOne(query)
          //   .then(async day => {
          //TODO Need tests!!!
              if (await checkReceipt(day.receipts, receiptToSave)) {
                const array = await writeItemsFromCatalog([...day.items, ...items], id).then(res => res.map((item => {
                  return item.value;
                })));
                await Day.updateOne(query, {
                  $set: { items: array, receipts: [...day.receipts, receiptToSave] },
                }).then(async () => {
                  await Day.findOne(query).then(day => {
                    return res.status(200).json(day);
                  });
                });
              } else {
                return next(createError(409, 'Данный чек уже добавлен'));
              }
            // })
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
      return array.splice(array.findIndex((item) => {
        return item._id.toString() === body.id.toString()
      }), 1);
    })
    .then(async array => {
      return updateDayElement(id, body.id, array);
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
