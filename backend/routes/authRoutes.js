const express = require('express');
const router = express.Router({ mergeParams: true });
const authController = require('../controllers/authController');
const withOrganization = require('../middlewares/withOrganization');

router.use(withOrganization);

router.post('/login', authController.login);

module.exports = router;
