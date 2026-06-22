const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getProperties, getFeatured, getPropertyById, createProperty, updateProperty,
  deleteProperty, approveProperty, rejectProperty, getMyProperties, getAllPropertiesAdmin,
} = require('../controllers/propertyController');

// Specific routes BEFORE the dynamic /:id route to avoid collisions
router.get('/featured', getFeatured);
router.get('/owner/mine', protect, authorize('Owner'), getMyProperties);
router.get('/admin/all', protect, authorize('Admin'), getAllPropertiesAdmin);

router.get('/', getProperties);
router.get('/:id', getPropertyById);

router.post('/', protect, authorize('Owner'), createProperty);
router.put('/:id', protect, authorize('Owner', 'Admin'), updateProperty);
router.delete('/:id', protect, authorize('Owner', 'Admin'), deleteProperty);

router.patch('/:id/approve', protect, authorize('Admin'), approveProperty);
router.patch('/:id/reject', protect, authorize('Admin'), rejectProperty);

module.exports = router;
