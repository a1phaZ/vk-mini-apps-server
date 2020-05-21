const Day = require('../models/Day');
const Catalog = require('../models/Catalog');

const catalog = async (req, res, next) => {
	const {a} = req.query;
	const {id} = req.payload;
	switch (a) {
		case 'fill':
			await Day.find({userId: req.payload.id})
				.then(async days => {
					await days
						.map((day)=> {
							return day.items;
						})
						.flat()
						.map(item => item.name)
						.sort((a, b) => {
							if (a > b) return 1;
							if (a < b) return -1;
							return 0;
						})
						.reduce((uniq, item) => {
							return uniq.includes(item) ? uniq : [ ...uniq, item ];
						}, [])
						.map(async item => {
							await Catalog.updateOne({userId: id, name: item}, { $set: {name: item} }, {upsert: true});
						});
					await res.json({ message: 'Успех' });
				})
				.catch(err => next(err));
			break;
		case 'get':
			await Catalog.find({userId: id})
				.then(response => {
					if (!response) res.json([]);
					res.json(response);
				})
				.catch(err => next(err));
			break;
		default:
			next();
	}
}

const updateCatalog = async (req, res, next) => {
	const { payload: { id }, body: {update}} = req;
	await update.map(async (item) => {
		await Catalog.updateOne({userId: id, name: item.name}, { $set: {...item} }, {upsert: true}).catch(e => next(e));
	})
	await res.json({ message: 'Успех' });
}

module.exports = {
	catalog,
	updateCatalog
}
