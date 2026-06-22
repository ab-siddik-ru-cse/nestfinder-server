const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    propertyType: {
      type: String,
      enum: ['Apartment', 'House', 'Villa', 'Studio', 'Office', 'Shop'],
      required: true,
    },
    rent: { type: Number, required: true, min: 0 },
    rentType: { type: String, enum: ['Monthly', 'Weekly', 'Daily'], default: 'Monthly' },
    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    size: { type: Number, min: 0 },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    extraFeatures: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    rejectionFeedback: { type: String, default: '' },
  },
  { timestamps: true }
);

propertySchema.index({ location: 'text', title: 'text' });

module.exports = mongoose.model('Property', propertySchema);
