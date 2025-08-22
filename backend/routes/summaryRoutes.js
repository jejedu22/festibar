const express = require('express');
const router = express.Router({ mergeParams: true });
const summaryController = require('../controllers/summaryController');
const withOrganization = require('../middlewares/withOrganization');

router.use(withOrganization);

router.get('/today', summaryController.today);
router.get('/daily', summaryController.daily);

module.exports = router;
