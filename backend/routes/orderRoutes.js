// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const orderController = require('../controllers/orderController');
const withOrganization = require('../middlewares/withOrganization');
const userAuth = require('../middlewares/userAuth');

router.use(withOrganization);

router.get('/all', userAuth, orderController.getAll);
router.delete('/:orderId/items/:productId', userAuth, orderController.removeItem);

router.post('/', orderController.create);
router.get('/:id', orderController.getOne);
router.delete('/:id', orderController.remove);
router.delete('/', userAuth, orderController.clearAll);

module.exports = router;
