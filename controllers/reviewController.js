const Review = require('../models/Review');

// @desc    Tenant: add a review for a property
// @route   POST /api/reviews/:propertyId
exports.addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }
    const review = await Review.create({
      tenant: req.user._id,
      property: req.params.propertyId,
      rating,
      comment,
    });
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
};

// @desc    Public: get all reviews for a property
// @route   GET /api/reviews/:propertyId
exports.getPropertyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ property: req.params.propertyId })
      .sort({ createdAt: -1 })
      .populate('tenant', 'name photo');
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};
