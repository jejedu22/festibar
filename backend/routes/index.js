const express = require('express');
const router = express.Router();

router.use('/products', require('./products'));
router.use('/categories', require('./categories'));
router.use('/orders', require('./orders'));
router.use('/summary', require('./summary'));
router.use('/auth', require('./auth'));

module.exports = router;
