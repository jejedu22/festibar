// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const orderController = require('../controllers/orderController');
const withOrganization = require('../middlewares/withOrganization');

router.use(withOrganization);

router.post('/', orderController.create);
router.get('/:id', orderController.getOne);
router.delete('/:id', orderController.remove);
router.delete('/', orderController.clearAll);

module.exports = router;
