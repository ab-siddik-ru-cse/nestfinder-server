const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { addReview, getPropertyReviews } = require('../controllers/reviewController');

router.post('/:propertyId', protect, authorize('Tenant'), addReview);
router.get('/:propertyId', getPropertyReviews);

module.exports = router;
