const router = require('express').Router();

const productRoutes = require('./product');
const categoryRoutes = require('./category');
const brandRoutes = require('./brand');
const reviewRoutes = require('./review');
const wishlistRoutes = require('./wishlist');

router.use('/product', productRoutes);
router.use('/category', categoryRoutes);
router.use('/brand', brandRoutes);
router.use('/review', reviewRoutes);
router.use('/wishlist', wishlistRoutes);

module.exports = router;
