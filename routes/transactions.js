const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllTransactions } = require('../controllers/transactionController');

router.get('/', protect, authorize('Admin'), getAllTransactions);

module.exports = router;
