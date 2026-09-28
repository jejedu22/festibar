// backend/routes/productRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const productController = require('../controllers/productController');
const withOrganization = require('../middlewares/withOrganization');
const orgAuth = require('../middlewares/orgAuth');

router.use(withOrganization);

router.get('/', productController.getAll);
router.post('/', orgAuth('manager'), productController.create);
router.put('/:id', orgAuth('manager'), productController.update);
router.patch('/:id/availability', orgAuth('manager'), productController.setAvailability);
router.delete('/:id', orgAuth('manager'), productController.remove);

module.exports = router;
