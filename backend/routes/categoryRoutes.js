// backend/routes/categoryRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const categoryController = require('../controllers/categoryController');
const withOrganization = require('../middlewares/withOrganization');
const userAuth = require('../middlewares/userAuth');

router.use(withOrganization);

router.get('/', categoryController.getAll);
router.post('/', userAuth, categoryController.create);
router.put('/:id', userAuth, categoryController.update);
router.delete('/:id', userAuth, categoryController.remove);

module.exports = router;
