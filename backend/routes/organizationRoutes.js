// backend/routes/organizationRoutes.js
const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const withOrganization = require('../middlewares/withOrganization');
const adminAuth = require('../middlewares/adminAuth');

// Gestion des organisations : réservée à l'administrateur
router.get('/', adminAuth, organizationController.getAll);
router.post('/', adminAuth, organizationController.create);
router.delete('/:id', adminAuth, organizationController.delete);
router.put('/:id', adminAuth, organizationController.update);

// Public : utilisé par les pages de commande pour afficher le nom
router.get('/:orgSlug', withOrganization, organizationController.getOne);

module.exports = router;
