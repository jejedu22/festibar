const express = require('express');
const router = express.Router({ mergeParams: true });
const categoryController = require('../controllers/categoryController');
const withOrganization = require('../middlewares/withOrganization');

router.use(withOrganization);

router.get('/', categoryController.getAll);
router.post('/', categoryController.create);
router.delete('/:id', categoryController.remove);

module.exports = router;
