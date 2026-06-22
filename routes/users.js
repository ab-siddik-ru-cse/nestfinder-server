const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllUsers, changeUserRole, updateMyProfile } = require('../controllers/userController');

router.get('/', protect, authorize('Admin'), getAllUsers);
router.patch('/:id/role', protect, authorize('Admin'), changeUserRole);
router.put('/me', protect, updateMyProfile);

module.exports = router;
