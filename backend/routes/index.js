// backend/routes/index.js
const express = require('express');
const router = express.Router();

// Routes frontend
router.use('/organizations', require('./frontendOrganizationRoutes'));

// Routes liées à une organisation (backend admin)
router.use('/:orgSlug/products', require('./productRoutes'));
router.use('/:orgSlug/categories', require('./categoryRoutes'));
router.use('/:orgSlug/orders', require('./orderRoutes'));
router.use('/:orgSlug/summary', require('./summaryRoutes'));
router.use('/:orgSlug/login', require('./authRoutes'));

// Routes globales (admin)
router.use('/admin/auth', require('./adminAuthRoutes'));
router.use('/admin/organizations', require('./organizationRoutes'));
router.use('/contact', require('./contactRoutes'));
router.use('/legal', require('./legalRoutes'));
router.use('/config', require('./configRoutes'));

module.exports = router;
