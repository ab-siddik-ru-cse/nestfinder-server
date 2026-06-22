const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const PDFDocument = require('pdfkit');

// @desc    Owner: analytics summary (earnings, counts, monthly chart data)
// @route   GET /api/owner/analytics
exports.getOwnerAnalytics = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const myProperties = await Property.find({ owner: ownerId }).select('_id');
    const propertyIds = myProperties.map((p) => p._id);

    const [totalEarningsAgg, totalBookings, approvedBookings, transactions] = await Promise.all([
      Transaction.aggregate([
        { $match: { owner: ownerId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Booking.countDocuments({ property: { $in: propertyIds } }),
      Booking.countDocuments({ property: { $in: propertyIds }, status: 'Approved' }),
      Transaction.find({ owner: ownerId }).select('amount date'),
    ]);

    const totalEarnings = totalEarningsAgg[0]?.total || 0;

    // Build last-12-months earnings series
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString('en-US', { month: 'short' }), earnings: 0 });
    }
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.earnings += t.amount;
    });

    res.json({
      totalEarnings,
      totalProperties: myProperties.length,
      totalBookings,
      approvedBookings,
      monthlyEarnings: months.map(({ month, earnings }) => ({ month, earnings })),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Owner: download earnings report as PDF
// @route   GET /api/owner/report/pdf
exports.downloadReportPDF = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const transactions = await Transaction.find({ owner: ownerId })
      .populate('property', 'title')
      .populate('tenant', 'name')
      .sort({ date: -1 });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=earnings-report-${Date.now()}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('NestFinder — Earnings Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).fillColor('#666').text(`Owner: ${req.user.name}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    doc.fontSize(14).fillColor('#000').text(`Total Earnings: ৳${total.toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(12).text('Transaction History', { underline: true });
    doc.moveDown(0.5);

    transactions.forEach((t) => {
      doc.fontSize(10).fillColor('#333').text(
        `${new Date(t.date).toLocaleDateString()}  |  ${t.property?.title || 'N/A'}  |  ${t.tenant?.name || 'N/A'}  |  ৳${t.amount.toLocaleString()}`
      );
    });

    if (transactions.length === 0) {
      doc.fontSize(10).fillColor('#999').text('No transactions yet.');
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};
