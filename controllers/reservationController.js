const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const { validateReservation } = require('../utils/validation');

// @desc    Create new reservation
// @route   POST /api/reservations
// @access  Private
const createReservation = asyncHandler(async (req, res) => {
  // Validate input
  const { error } = validateReservation(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { date, slot, guests, tableNumber, specialRequest, contactPhone } = req.body;

  // Create reservation object
  const reservationData = {
    userId: req.user._id,
    userEmail: req.user.email,
    userName: req.user.name,
    date,
    slot,
    guests,
    tableNumber,
    specialRequest,
    contactPhone,
  };

  const reservation = new Reservation(reservationData);
  await reservation.save();

  // Populate user details
  const populatedReservation = await Reservation.findById(reservation._id)
    .populate('user', 'name email phone');

  res.status(201).json({
    success: true,
    message: 'Reservation created successfully',
    data: populatedReservation,
  });
});

// @desc    Get user reservations
// @route   GET /api/reservations
// @access  Private
const getUserReservations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = { userId: req.user.id };

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by upcoming/past reservations
  if (req.query.upcoming === 'true') {
    query.date = { $gte: new Date().setHours(0, 0, 0, 0) };
  } else if (req.query.past === 'true') {
    query.date = { $lt: new Date().setHours(0, 0, 0, 0) };
  }

  const total = await Reservation.countDocuments(query);
  const reservations = await Reservation.find(query)
    .populate('userId', 'name email phone')
    .sort({ date: -1, slot: -1 })
    .limit(limit)
    .skip(startIndex);

  // Pagination result
  const pagination = {};
  if (startIndex + limit < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: reservations.length,
    total,
    pagination,
    data: reservations,
  });
});

// @desc    Get all reservations for admin
// @route   GET /api/reservations/admin/all
// @access  Private/Admin
const getAdminReservations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status;
  const date = req.query.date;
  const search = req.query.search;

  let query = {};

  if (status) query.status = status;
  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    query.date = { $gte: startDate, $lt: endDate };
  }
  if (search) {
    query.$or = [
      { userName: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } },
      { contactPhone: { $regex: search, $options: 'i' } },
      { tableNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const startIndex = (page - 1) * limit;
  const total = await Reservation.countDocuments(query);
  const reservations = await Reservation.find(query)
    .populate('userId', 'name email phone')
    .sort({ date: 1, slot: 1 })
    .limit(limit)
    .skip(startIndex);

  const pagination = {};
  if (startIndex + limit < total) {
    pagination.next = { page: page + 1, limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.status(200).json({
    success: true,
    count: reservations.length,
    total,
    pagination,
    data: reservations,
  });
});

// @desc    Update reservation status and assign table (Admin)
// @route   PUT /api/reservations/admin/:id
// @access  Private/Admin
const updateAdminReservation = asyncHandler(async (req, res) => {
  const { status, tableNumber, specialRequests } = req.body;

  const validStatuses = ['confirmed', 'seated', 'completed', 'cancelled', 'no-show'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid reservation status',
    });
  }

  const reservation = await Reservation.findByIdAndUpdate(
    req.params.id,
    {
      ...(status && { status }),
      ...(tableNumber && { tableNumber }),
      ...(specialRequests && { specialRequests }),
      updatedAt: new Date(),
    },
    { new: true, runValidators: true }
  ).populate('userId', 'name email phone');

  if (!reservation) {
    return res.status(404).json({
      success: false,
      message: 'Reservation not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Reservation updated successfully',
    data: reservation,
  });
});

// @desc    Get reservation statistics for admin
// @route   GET /api/reservations/admin/stats
// @access  Private/Admin
const getReservationStats = asyncHandler(async (req, res) => {
  const totalReservations = await Reservation.countDocuments();
  const pendingReservations = await Reservation.countDocuments({ status: 'pending' });
  const noShowReservations = await Reservation.countDocuments({ status: 'no-show' });
  const confirmedReservations = await Reservation.countDocuments({ status: 'confirmed' });
  const seatedReservations = await Reservation.countDocuments({ status: 'seated' });
  const completedReservations = await Reservation.countDocuments({ status: 'completed' });
  const cancelledReservations = await Reservation.countDocuments({ status: 'cancelled' });

  res.status(200).json({
    success: true,
    data: {
      totalReservations,
      pendingReservations,
      confirmedReservations,
      seatedReservations,
      completedReservations,
      cancelledReservations,
      reservationsByStatus: {
        pending: pendingReservations,
        confirmed: confirmedReservations,
        seated: seatedReservations,
        completed: completedReservations,
        cancelled: cancelledReservations,
      },
    },
  });
});

module.exports = {
  createReservation,
  getUserReservations,
  getAdminReservations,
  updateAdminReservation,
  getReservationStats,
};