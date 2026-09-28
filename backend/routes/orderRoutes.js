// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const orderController = require('../controllers/orderController');
const withOrganization = require('../middlewares/withOrganization');
const orgAuth = require('../middlewares/orgAuth');

router.use(withOrganization);

// Gestionnaire uniquement
router.get('/all', orgAuth('manager'), orderController.getAll);
router.delete('/:orderId/items/:productId', orgAuth('manager'), orderController.removeItem);
router.delete('/', orgAuth('manager'), orderController.clearAll);

// Serveurs et gestionnaire
router.post('/', orgAuth('staff', 'manager'), orderController.create);
router.get('/:id', orgAuth('staff', 'manager'), orderController.getOne);
router.delete('/:id', orgAuth('staff', 'manager'), orderController.cancel);

module.exports = router;
