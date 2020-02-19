const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const { createError, handleError } = require('./handlers/error');
const MongoStore = require('connect-mongo')(session);

dotenv.config();

const app = express();

app.disable('x-powered-by');

mongoose.Promise = global.Promise;
const dbPath =
  process.env.NODE_ENV !== 'test'
    ? process.env.MONGODB_URI || process.env.MONGOLAB_URI
    : process.env.MONGODB_URI_TEST;
mongoose.connect(dbPath, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
});
mongoose.connection.on('connected', () =>
  console.log(`MongoDB connection established successfully`),
);
mongoose.connection.on('disconnected', () =>
  console.log(`MongoDB connection close`),
);
mongoose.connection.on(`error`, () => {
  console.log(`MongoDB connection error`);
  process.exit();
});

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'balance',
    cookie: { maxAge: 60000 },
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      url: dbPath,
      collection: 'sessions'
    })
  }),
);

require('./models/User');
require('./config/passport');
app.use(require('./routes'));

app.use(function(req, res, next) {
  next(createError(404, 'Запрашиваемый адрес не найден'));
});

// error-box handler
app.use((err, req, res, next) => handleError(err, res));

app.listen(process.env.PORT || 3000);

module.exports = app;
