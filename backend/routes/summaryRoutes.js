const express = require('express');
const router = express.Router({ mergeParams: true });
const summaryController = require('../controllers/summaryController');
const withOrganization = require('../middlewares/withOrganization');
const userAuth = require('../middlewares/userAuth');

router.use(withOrganization);

router.get('/today', userAuth, summaryController.today);
router.get('/daily', userAuth, summaryController.daily);

module.exports = router;
