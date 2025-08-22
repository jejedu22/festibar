const express = require('express');
const router = express.Router({ mergeParams: true });
const productController = require('../controllers/productController');
const withOrganization = require('../middlewares/withOrganization');
const userAuth = require('../middlewares/userAuth');

router.use(withOrganization);

router.get('/', productController.getAll);
router.post('/', userAuth, productController.create);
router.put('/:id', userAuth, productController.update);
router.delete('/:id', userAuth, productController.remove);

module.exports = router;
