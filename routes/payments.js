const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createCheckoutSession, handleWebhook } = require('../controllers/paymentController');

// NOTE: webhook route is mounted with express.raw() directly in server.js
// (Stripe requires the raw, unparsed body to verify the signature), so it is
// NOT re-declared here with express.json() in between. This router only
// exposes the authenticated checkout-session creation endpoint.
router.post('/create-checkout-session', protect, authorize('Tenant'), createCheckoutSession);

module.exports = router;
module.exports.handleWebhook = handleWebhook;
