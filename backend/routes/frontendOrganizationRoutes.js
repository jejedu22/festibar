// backend/routes/frontendOrganizationRoutes.js
const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const withOrganization = require('../middlewares/withOrganization');

router.get('/:orgSlug', withOrganization, organizationController.getOne);

module.exports = router;
