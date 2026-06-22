const Favorite = require('../models/Favorite');

// @desc    Tenant: add property to favorites
// @route   POST /api/favorites/:propertyId
exports.addFavorite = async (req, res, next) => {
  try {
    const existing = await Favorite.findOne({ tenant: req.user._id, property: req.params.propertyId });
    if (existing) return res.status(200).json({ favorite: existing, message: 'Already in favorites' });

    const favorite = await Favorite.create({ tenant: req.user._id, property: req.params.propertyId });
    res.status(201).json({ favorite });
  } catch (err) {
    next(err);
  }
};

// @desc    Tenant: remove property from favorites
// @route   DELETE /api/favorites/:propertyId
exports.removeFavorite = async (req, res, next) => {
  try {
    await Favorite.findOneAndDelete({ tenant: req.user._id, property: req.params.propertyId });
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    next(err);
  }
};

// @desc    Tenant: list own favorites
// @route   GET /api/favorites
exports.getFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ tenant: req.user._id })
      .populate('property')
      .sort({ createdAt: -1 });
    res.json({ favorites });
  } catch (err) {
    next(err);
  }
};
