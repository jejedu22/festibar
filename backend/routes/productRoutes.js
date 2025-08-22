const express = require('express');
const router = express.Router({ mergeParams: true });
const productController = require('../controllers/productController');
const withOrganization = require('../middlewares/withOrganization');

router.use(withOrganization);

router.get('/', productController.getAll);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

module.exports = router;
