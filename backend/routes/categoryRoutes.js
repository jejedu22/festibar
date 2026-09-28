// backend/routes/categoryRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const categoryController = require('../controllers/categoryController');
const withOrganization = require('../middlewares/withOrganization');
const orgAuth = require('../middlewares/orgAuth');

router.use(withOrganization);

router.get('/', categoryController.getAll);
router.post('/', orgAuth('manager'), categoryController.create);
router.put('/order', orgAuth('manager'), categoryController.updateOrder);
router.put('/:id', orgAuth('manager'), categoryController.update);
router.delete('/:id', orgAuth('manager'), categoryController.remove);

module.exports = router;
