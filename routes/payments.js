const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createCheckoutSession, verifyPayment, handleWebhook } = require('../controllers/paymentController');

// NOTE: webhook route is mounted with express.raw() directly in server.js
router.post('/create-checkout-session', protect, authorize('Tenant'), createCheckoutSession);
router.get('/verify', protect, verifyPayment);

module.exports = router;
module.exports.handleWebhook = handleWebhook;
