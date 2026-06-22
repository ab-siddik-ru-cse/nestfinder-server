const Transaction = require('../models/Transaction');

// @desc    Admin: list all transactions, paginated, with total revenue
// @route   GET /api/transactions
exports.getAllTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total, revenueAgg] = await Promise.all([
      Transaction.find()
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('tenant', 'name email')
        .populate('owner', 'name email')
        .populate('property', 'title'),
      Transaction.countDocuments(),
      Transaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    res.json({
      transactions,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      total,
      totalRevenue: revenueAgg[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
};
