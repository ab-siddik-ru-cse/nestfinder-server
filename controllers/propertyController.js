const Property = require('../models/Property');

// @desc    Public: list approved properties with search/filter/sort/pagination
// @route   GET /api/properties
exports.getProperties = async (req, res, next) => {
  try {
    const { location, propertyType, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;

    const query = { status: 'Approved' };
    if (location) query.location = { $regex: location, $options: 'i' };
    if (propertyType) query.propertyType = propertyType;
    if (minPrice || maxPrice) {
      query.rent = {};
      if (minPrice) query.rent.$gte = Number(minPrice);
      if (maxPrice) query.rent.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { rent: 1 };
    if (sort === 'price_desc') sortOption = { rent: -1 };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [properties, total] = await Promise.all([
      Property.find(query).sort(sortOption).skip(skip).limit(limitNum).populate('owner', 'name email photo'),
      Property.countDocuments(query),
    ]);

    res.json({
      properties,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      total,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Public: get 6 featured (approved) properties
// @route   GET /api/properties/featured
exports.getFeatured = async (req, res, next) => {
  try {
    const properties = await Property.find({ status: 'Approved' })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('owner', 'name email photo');
    res.json({ properties });
  } catch (err) {
    next(err);
  }
};

// @desc    Public: get single property
// @route   GET /api/properties/:id
exports.getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).populate('owner', 'name email photo');
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json({ property });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner: create a property (status Pending by default)
// @route   POST /api/properties
exports.createProperty = async (req, res, next) => {
  try {
    const {
      title, description, location, propertyType, rent, rentType,
      bedrooms, bathrooms, size, amenities, images, extraFeatures,
    } = req.body;

    if (!title || !description || !location || !propertyType || rent == null || bedrooms == null || bathrooms == null) {
      return res.status(400).json({ message: 'Missing required property fields' });
    }

    const property = await Property.create({
      owner: req.user._id,
      title, description, location, propertyType,
      rent, rentType, bedrooms, bathrooms, size,
      amenities: amenities || [],
      images: images || [],
      extraFeatures: extraFeatures || '',
      status: 'Pending',
    });

    res.status(201).json({ property });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner: update own property
// @route   PUT /api/properties/:id
exports.updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to edit this property' });
    }

    const allowedFields = [
      'title', 'description', 'location', 'propertyType', 'rent', 'rentType',
      'bedrooms', 'bathrooms', 'size', 'amenities', 'images', 'extraFeatures',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) property[field] = req.body[field];
    });

    // Editing a rejected/approved property sends it back for review
    if (req.user.role !== 'Admin') {
      property.status = 'Pending';
      property.rejectionFeedback = '';
    }

    await property.save();
    res.json({ property });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner/Admin: delete property
// @route   DELETE /api/properties/:id
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this property' });
    }
    await property.deleteOne();
    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: approve property
// @route   PATCH /api/properties/:id/approve
exports.approveProperty = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', rejectionFeedback: '' },
      { new: true }
    );
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json({ property });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: reject property with required feedback
// @route   PATCH /api/properties/:id/reject
exports.rejectProperty = async (req, res, next) => {
  try {
    const { rejectionFeedback } = req.body;
    if (!rejectionFeedback || !rejectionFeedback.trim()) {
      return res.status(400).json({ message: 'Rejection feedback is required' });
    }
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected', rejectionFeedback },
      { new: true }
    );
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json({ property });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner: get own properties (all statuses)
// @route   GET /api/properties/owner/mine
exports.getMyProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ properties });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: get all properties (any status) with pagination
// @route   GET /api/properties/admin/all
exports.getAllPropertiesAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [properties, total] = await Promise.all([
      Property.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('owner', 'name email'),
      Property.countDocuments(query),
    ]);

    res.json({ properties, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1, total });
  } catch (err) {
    next(err);
  }
};
