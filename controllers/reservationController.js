const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const { validateReservation } = require('../utils/validation');

// Temporary in-memory reservations for testing
let tempReservations = [
  {
    _id: '1',
    user: {
      _id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
    },
    date: new Date('2024-01-20T19:00:00Z'),
    slot: 5,
    guests: 4,
    status: 'confirmed',
    specialRequests: 'Window seat preferred',
    tableNumber: 'T-05',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  },
];

let tempReservationId = 5;

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

  try {
    await reservation.save();

    // Populate user details
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'name email phone');

    // Also add to temp storage for admin demo
    const tempReservation = {
      _id: String(tempReservationId++),
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      date: new Date(date),
      slot,
      guests,
      status: 'confirmed',
      specialRequests: specialRequest || null,
      tableNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tempReservations.unshift(tempReservation);

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: populatedReservation,
    });
  } catch (error) {
    console.error('Database reservation creation failed, using temp storage...', error);

    // Fallback to temp storage only
    const tempReservation = {
      _id: String(tempReservationId++),
      user: {
        _id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
      },
      date: new Date(date),
      slot,
      guests,
      status: 'pending',
      specialRequests: specialRequest || null,
      tableNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tempReservations.unshift(tempReservation);

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully (temp storage)',
      data: tempReservation,
    });
  }
});

// @desc    Get user reservations
// @route   GET /api/reservations
// @access  Private
const getUserReservations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = { user: req.user.id };

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
    .populate('user', 'name email phone')
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
  try {
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
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.phone': { $regex: search, $options: 'i' } },
        { tableNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await Reservation.countDocuments(query);
    const reservations = await Reservation.find(query)
      .populate('user', 'name email phone')
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
  } catch (dbError) {
    // Fallback to temp storage
    console.log('Using temp storage for admin reservations...');

    let filteredReservations = [...tempReservations];

    // Apply filters
    if (req.query.status) {
      filteredReservations = filteredReservations.filter(res => res.status === req.query.status);
    }
    if (req.query.date) {
      const filterDate = new Date(req.query.date).toDateString();
      filteredReservations = filteredReservations.filter(res =>
        new Date(res.date).toDateString() === filterDate
      );
    }

    // Sort by date and time
    filteredReservations.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedReservations = filteredReservations.slice(startIndex, endIndex);
    const total = filteredReservations.length;

    const pagination = {};
    if (endIndex < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: paginatedReservations.length,
      total,
      pagination,
      data: paginatedReservations,
    });
  }
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

  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      {
        ...(status && { status }),
        ...(tableNumber && { tableNumber }),
        ...(specialRequests && { specialRequests }),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');

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
  } catch (dbError) {
    // Fallback to temp storage
    console.log('Using temp storage for updating reservation...');

    const reservationIndex = tempReservations.findIndex(res => res._id === req.params.id);

    if (reservationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    tempReservations[reservationIndex] = {
      ...tempReservations[reservationIndex],
      ...(status && { status }),
      ...(tableNumber && { tableNumber }),
      ...(specialRequests && { specialRequests }),
      updatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully (temp storage)',
      data: tempReservations[reservationIndex],
    });
  }
});

// @desc    Get reservation statistics for admin
// @route   GET /api/reservations/admin/stats
// @access  Private/Admin
const getReservationStats = asyncHandler(async (req, res) => {
  try {
    const totalReservations = await Reservation.countDocuments();
    const noShowReservations = await Reservation.countDocuments({ status: 'no-show' });
    const confirmedReservations = await Reservation.countDocuments({ status: 'confirmed' });
    const seatedReservations = await Reservation.countDocuments({ status: 'seated' });
    const completedReservations = await Reservation.countDocuments({ status: 'completed' });
    const cancelledReservations = await Reservation.countDocuments({ status: 'cancelled' });

    res.status(200).json({
      success: true,
      data: {
        totalReservations,
        noShowReservations,
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
  } catch (dbError) {
    // Fallback stats for temp storage
    const totalReservations = tempReservations.length;
    const noShowReservations = tempReservations.filter(r => r.status === 'no-show').length;
    const confirmedReservations = tempReservations.filter(r => r.status === 'confirmed').length;
    const seatedReservations = tempReservations.filter(r => r.status === 'seated').length;
    const completedReservations = tempReservations.filter(r => r.status === 'completed').length;
    const cancelledReservations = tempReservations.filter(r => r.status === 'cancelled').length;

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
  }
});

// Export temp reservations for other controllers
const getTempReservations = () => tempReservations;

module.exports = {
  createReservation,
  getUserReservations,
  getAdminReservations,
  updateAdminReservation,
  getReservationStats,
  getTempReservations,
};