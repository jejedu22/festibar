// backend/routes/summaryRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const summaryController = require('../controllers/summaryController');
const summaryExportController = require('../controllers/summaryExportController');
const withOrganization = require('../middlewares/withOrganization');
const orgAuth = require('../middlewares/orgAuth');

router.use(withOrganization, orgAuth('manager'));

router.get('/today', summaryController.today);
router.get('/daily', summaryController.daily);
router.get('/daily/export', summaryExportController.exportOrders);

module.exports = router;
