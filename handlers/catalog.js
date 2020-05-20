const Day = require('../models/Day');
const Catalog = require('../models/Catalog');

const catalog = async (req, res, next) => {
	const {a} = req.query;
	const {id} = req.payload;
	switch (a) {
		case 'fill':
			await Day.find({userId: req.payload.id})
				.then(days => {
					const daysMap = days
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
						.map(item => {
							return {
								name: item,
								definition: ''
							}
						});
					Catalog.findOne({userId: id})
						.then(response => {
							if (!response) {
								const catalog = new Catalog({
									userId: id,
									items: daysMap
								});
								catalog.save().then(res.json(catalog)).catch(err => next(err));
							}
							res.json(response);
						})

					// res.json(daysMap);
				})
				.catch(err => next(err));
			break;
		case 'get':
			await Catalog.findOne({userId: id})
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
	await Catalog.findOneAndUpdate({userId: id}, { $set: update }, { new: true })
		.then(response => res.json({ response: response }))
		.catch(err => next(err));
}

module.exports = {
	catalog,
	updateCatalog
}
