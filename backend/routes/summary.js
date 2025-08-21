const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');

router.get('/today', summaryController.today);
router.get('/daily', summaryController.daily);

module.exports = router;
