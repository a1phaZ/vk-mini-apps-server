const mongoose = require('mongoose');
const {Schema, model} = mongoose;
mongoose.Promise = global.Promise;

const CatalogSchema = new Schema({
	userId: { type: Schema.Types.ObjectId },
	name: { type: String },
	definition: {type: String},
});

const Catalog = model('Catalog', CatalogSchema);

module.exports = Catalog;
