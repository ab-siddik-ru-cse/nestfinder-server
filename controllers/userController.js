const User = require('../models/User');
const { sanitizeUser } = require('../utils/token');

// @desc    Admin: get all users, paginated
// @route   GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(),
    ]);

    res.json({
      users: users.map(sanitizeUser),
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      total,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: change a user's role
// @route   PATCH /api/users/:id/role
exports.changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['Tenant', 'Owner', 'Admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// @desc    Update own profile (name, photo)
// @route   PUT /api/users/me
exports.updateMyProfile = async (req, res, next) => {
  try {
    const { name, photo } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (photo !== undefined) user.photo = photo;
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};
