const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createBooking, getMyBookings, getOwnerBookings,
  approveBooking, rejectBooking, getAllBookingsAdmin,
} = require('../controllers/bookingController');

router.get('/admin/all', protect, authorize('Admin'), getAllBookingsAdmin);
router.get('/my', protect, authorize('Tenant'), getMyBookings);
router.get('/owner', protect, authorize('Owner'), getOwnerBookings);

router.post('/', protect, authorize('Tenant'), createBooking);
router.patch('/:id/approve', protect, authorize('Owner'), approveBooking);
router.patch('/:id/reject', protect, authorize('Owner'), rejectBooking);

module.exports = router;
