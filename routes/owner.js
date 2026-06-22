const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getOwnerAnalytics, downloadReportPDF } = require('../controllers/ownerController');

router.get('/analytics', protect, authorize('Owner'), getOwnerAnalytics);
router.get('/report/pdf', protect, authorize('Owner'), downloadReportPDF);

module.exports = router;
