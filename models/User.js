const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
mongoose.Promise = global.Promise;

const UserSchema = new Schema(
  {
    id: {
      type: Number,
      unique: true,
      required: [true, 'Отсутствует идентификатор пользователя']
    },
    email: { type: String },
    hash: { type: String },
    salt: { type: String },
    name: { type: String },
    phone: { type: String },
    kktPassword: { type: String },
  },
  { timestamps: true },
);

UserSchema.statics.authenticate = function(id, done) {
  User.findOne({ id: id }).exec(function (err, user) {
    if (err) {
      return done(err);
    } else if (!user) {
      return done(null, null);
    }
    return done(null, user);
  });
};


UserSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 512, 'sha512')
    .toString('hex');
};

UserSchema.methods.validatePassword = function(password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 512, 'sha512')
    .toString('hex');
  return this.hash === hash;
};

UserSchema.methods.generateJWT = function() {
  const today = new Date();
  const expirationDate = new Date(today);
  expirationDate.setDate(today.getDate() + 60);
  return jwt.sign(
    {
      email: this.email,
      vk_id: this.id,
      id: this._id,
      name: this.name,
      phone: this.phone,
      password: this.kktPassword,
      exp: parseInt(expirationDate.getTime() / 1000, 10),
    },
    'secret',
  );
};

UserSchema.methods.toAuthJson = function() {
  return {
    _id: this._id,
    vk_id: this.id,
    email: this.email,
    token: this.generateJWT(),
    name: this.name,
    phone: this.phone,
    password: this.kktPassword,
  };
};

const User = model('User', UserSchema);

module.exports = User;
