const Booking = require('../models/Booking');
const Property = require('../models/Property');

// @desc    Tenant: create a booking request (Pending / Pending payment)
// @route   POST /api/bookings
exports.createBooking = async (req, res, next) => {
  try {
    const { propertyId, moveInDate, contactNumber, additionalNotes, userInfo } = req.body;
    if (!propertyId || !moveInDate || !contactNumber) {
      return res.status(400).json({ message: 'propertyId, moveInDate, and contactNumber are required' });
    }

    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'Approved') {
      return res.status(404).json({ message: 'Property not found or not available for booking' });
    }

    const booking = await Booking.create({
      tenant: req.user._id,
      property: propertyId,
      moveInDate,
      contactNumber,
      additionalNotes: additionalNotes || '',
      userInfo: userInfo || { name: req.user.name, email: req.user.email },
      status: 'Pending',
      paymentStatus: 'Pending',
    });

    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Tenant: get own bookings
// @route   GET /api/bookings/my
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ tenant: req.user._id })
      .sort({ createdAt: -1 })
      .populate('property', 'title location images rent rentType');
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner: get bookings for properties they own
// @route   GET /api/bookings/owner
exports.getOwnerBookings = async (req, res, next) => {
  try {
    const myProperties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = myProperties.map((p) => p._id);

    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .sort({ createdAt: -1 })
      .populate('tenant', 'name email photo')
      .populate('property', 'title location');

    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner: approve a booking request
// @route   PATCH /api/bookings/:id/approve
exports.approveBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('property');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this booking' });
    }
    booking.status = 'Approved';
    await booking.save();
    res.json({ booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner: reject a booking request
// @route   PATCH /api/bookings/:id/reject
exports.rejectBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('property');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this booking' });
    }
    booking.status = 'Rejected';
    await booking.save();
    res.json({ booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: get all bookings, paginated
// @route   GET /api/bookings/admin/all
exports.getAllBookingsAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('tenant', 'name email')
        .populate({ path: 'property', select: 'title location owner', populate: { path: 'owner', select: 'name email' } }),
      Booking.countDocuments(),
    ]);

    res.json({ bookings, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1, total });
  } catch (err) {
    next(err);
  }
};
