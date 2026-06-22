const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    moveInDate: { type: Date, required: true },
    contactNumber: { type: String, required: true },
    userInfo: {
      name: String,
      email: String,
    },
    additionalNotes: { type: String, default: '' },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    paymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    transactionId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
