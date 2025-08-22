// backend/routes/organizationRoutes.js
const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const withOrganization = require('../middlewares/withOrganization');

router.get('/', organizationController.getAll);
router.post('/', organizationController.create);
router.delete('/:id', organizationController.delete);
router.put('/:id', organizationController.update);

router.get('/:orgSlug', withOrganization, organizationController.getOne);

module.exports = router;
