// backend/routes/index.js
const express = require('express');
const router = express.Router();

// Routes liées à une organisation
router.use('/:orgSlug/products', require('./productRoutes'));
router.use('/:orgSlug/categories', require('./categoryRoutes'));
router.use('/:orgSlug/orders', require('./orderRoutes'));
router.use('/:orgSlug/summary', require('./summaryRoutes'));
router.use('/:orgSlug/login', require('./authRoutes'));

// Routes globales (admin)
router.use('/admin/organizations', require('./organizationRoutes'));

module.exports = router;
