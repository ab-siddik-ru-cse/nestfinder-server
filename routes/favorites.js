const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { addFavorite, removeFavorite, getFavorites } = require('../controllers/favoriteController');

router.get('/', protect, authorize('Tenant'), getFavorites);
router.post('/:propertyId', protect, authorize('Tenant'), addFavorite);
router.delete('/:propertyId', protect, authorize('Tenant'), removeFavorite);

module.exports = router;
