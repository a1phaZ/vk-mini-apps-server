const mongoose = require('mongoose');
const { Schema, model } = mongoose;

mongoose.Promise = global.Promise;

const DaySchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId },
  dateTime: { type: Date },
  totalSum: { type: Number },
  items: [
    {
      name: { type: String },
      //definition: { type: String },
      definition: { type: Schema.Types.ObjectId, ref: 'Catalog' },
      quantity: { type: Number },
      price: { type: Number },
      sum: { type: Number },
      income: { type: Boolean },
      modifiers: [Schema.Types.Mixed],
      properties: [Schema.Types.Mixed],
    },
  ],
  receipts: [Schema.Types.Mixed],
});

const calcSum = (array) => {
  let totalSum = 0;
  array.forEach(async item => {
    if (item.income) {
      totalSum += item.sum;
    } else {
      totalSum -= item.sum;
    }
  });
  return totalSum;
}

DaySchema.pre('save', async function save(next) {
  const day = this;
  day.totalSum = calcSum(day.items);
  next();
});

DaySchema.pre('updateOne', async function updateOne(next) {
  const day = this;
  // const docToUpdate = await day.model.findOne(day.getQuery());
  const { items } = day._update.$set;
  const sumArray = [...items];
  const totalSum = calcSum(sumArray);
  day.set({totalSum: totalSum});
  next();
});

const Day = model('Day', DaySchema);

module.exports = Day;
