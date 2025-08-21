const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.create);
router.get('/:id', orderController.getOne);
router.delete('/:id', orderController.remove);
router.delete('/', orderController.clearAll);

module.exports = router;
