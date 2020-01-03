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

DaySchema.pre('save', function save(next) {
  const day = this;
  let totalSum = 0;
  day.items.forEach(item => {
    if (item.income) {
      totalSum += item.sum;
    } else {
      totalSum -= item.sum;
    }
  });
  day.totalSum = totalSum;
  next();
});

DaySchema.pre('updateOne', async function updateOne(next) {
  const day = this;
  const docToUpdate = await day.model.findOne(day.getQuery());
  const { items } = day._update.$push;
  let totalSum = 0;
  const sumArray = [...docToUpdate.items, ...items];
  sumArray.forEach(item => {
    if (item.income) {
      totalSum += item.sum;
    } else {
      totalSum -= item.sum;
    }
  });

  day.set({ totalSum: totalSum });
  next();
});

const Day = model('Day', DaySchema);

module.exports = Day;
