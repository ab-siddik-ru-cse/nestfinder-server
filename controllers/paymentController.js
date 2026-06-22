const Stripe = require('stripe');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Transaction = require('../models/Transaction');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Tenant: create a Stripe Checkout session for a booking
// @route   POST /api/payments/create-checkout-session
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }
    if (booking.paymentStatus === 'Completed') {
      return res.status(400).json({ message: 'This booking has already been paid' });
    }

    const property = booking.property;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd', // Stripe Checkout doesn't support BDT directly; amounts converted from BDT cents-equivalent
            product_data: {
              name: property.title,
              description: `Booking for ${property.location} — move-in ${new Date(booking.moveInDate).toLocaleDateString()}`,
              images: property.images?.length ? [property.images[0]] : undefined,
            },
            unit_amount: Math.round(property.rent * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking._id.toString(),
        propertyId: property._id.toString(),
        tenantId: req.user._id.toString(),
        ownerId: property.owner.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${booking._id}`,
      cancel_url: `${process.env.CLIENT_URL}/booking/cancel`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
};

// @desc    Stripe webhook — finalizes booking/payment status on successful payment
// @route   POST /api/payments/webhook
// NOTE: This route must receive the RAW request body (see server.js for the
// express.raw() middleware applied specifically to this path before json parsing).
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { bookingId, propertyId, tenantId, ownerId } = session.metadata || {};

    try {
      const booking = await Booking.findById(bookingId);
      if (booking && booking.paymentStatus !== 'Completed') {
        booking.paymentStatus = 'Completed';
        booking.status = 'Approved';
        booking.amountPaid = (session.amount_total || 0) / 100;
        booking.transactionId = session.payment_intent || session.id;
        await booking.save();

        await Transaction.create({
          booking: booking._id,
          tenant: tenantId,
          owner: ownerId,
          property: propertyId,
          amount: booking.amountPaid,
          stripeSessionId: session.id,
        });
      }
    } catch (err) {
      console.error('Error finalizing booking after payment:', err.message);
    }
  }

  res.json({ received: true });
};
