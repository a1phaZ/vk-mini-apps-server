const auth = require('../../handlers/auth');
const { catalog, updateCatalog } = require('../../controllers/catalog');
const router = require('express').Router();

router.get('/', auth.required, catalog);
router.put('/update', auth.required, updateCatalog);

module.exports = router;
