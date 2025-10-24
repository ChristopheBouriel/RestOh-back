const Reservation = require('../models/Reservation');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validateReservation } = require('../utils/validation');
const { isValidSlot } = require('../utils/timeSlots');
const {
  validateReservationUpdate,
  canCancelReservation,
  addTableBooking,
  removeTableBooking
} = require('../utils/reservationHelpers');
const Table = require('../models/Table');

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

  // If tableNumber array is provided, update table bookings
  if (tableNumber && tableNumber.length > 0) {
    try {
      for (const tableNum of tableNumber) {
        const table = await Table.findOne({ tableNumber: parseInt(tableNum) });
        if (table) {
          await addTableBooking(table, date, slot);
          console.log(`Table ${tableNum} booked for reservation ${reservation._id}`);
        } else {
          console.warn(`Table ${tableNum} not found when creating reservation`);
        }
      }
    } catch (error) {
      console.error('Error updating table bookings:', error);
    }
  }

  // Update user statistics
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        totalReservations: 1,
      },
    });
    console.log('User statistics updated for new reservation');
  } catch (error) {
    console.error('Error updating user statistics:', error);
  }

  // Populate user details
  const populatedReservation = await Reservation.findById(reservation._id)
    .populate('userId', 'name email phone');

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

  let query = { userId: req.user._id };

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

  // Get the original reservation to handle table changes
  const originalReservation = await Reservation.findById(req.params.id);
  if (!originalReservation) {
    return res.status(404).json({
      success: false,
      message: 'Reservation not found',
    });
  }

  // Handle table number changes
  if (tableNumber && JSON.stringify(tableNumber) !== JSON.stringify(originalReservation.tableNumber)) {
    try {
      // Remove booking from old tables if they exist
      if (originalReservation.tableNumber && originalReservation.tableNumber.length > 0) {
        for (const oldTableNum of originalReservation.tableNumber) {
          const oldTable = await Table.findOne({ tableNumber: parseInt(oldTableNum) });
          if (oldTable) {
            await removeTableBooking(oldTable, originalReservation.date, originalReservation.slot);
            console.log(`Removed booking from table ${oldTableNum}`);
          }
        }
      }

      // Add booking to new tables
      if (tableNumber && tableNumber.length > 0) {
        for (const newTableNum of tableNumber) {
          const newTable = await Table.findOne({ tableNumber: parseInt(newTableNum) });
          if (newTable) {
            await addTableBooking(newTable, originalReservation.date, originalReservation.slot);
            console.log(`Added booking to table ${newTableNum}`);
          } else {
            return res.status(400).json({
              success: false,
              message: `Table ${newTableNum} not found`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating table bookings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating table bookings',
      });
    }
  }

  // Handle status changes (especially cancellation)
  if (status === 'cancelled' && originalReservation.status !== 'cancelled' && originalReservation.tableNumber && originalReservation.tableNumber.length > 0) {
    try {
      for (const tableNum of originalReservation.tableNumber) {
        const table = await Table.findOne({ tableNumber: parseInt(tableNum) });
        if (table) {
          await removeTableBooking(table, originalReservation.date, originalReservation.slot);
          console.log(`Removed booking from table ${tableNum} due to cancellation`);
        }
      }
    } catch (error) {
      console.error('Error removing table bookings on cancellation:', error);
    }
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

// @desc    Update user's own reservation
// @route   PUT /api/reservations/:id
// @access  Private
const updateUserReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return res.status(404).json({
      success: false,
      message: 'Reservation not found',
    });
  }

  if (reservation.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this reservation',
    });
  }

  // Check if reservation can be updated (only confirmed reservations)
  if (reservation.status !== 'confirmed') {
    return res.status(400).json({
      success: false,
      message: 'Only confirmed reservations can be updated',
    });
  }

  // Validate slot number if provided
  const { date, slot } = req.body;
  if (slot && !isValidSlot(slot)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid slot number',
    });
  }

  // Use helper to validate time constraints
  const validation = validateReservationUpdate(reservation, { date, slot });
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.errors[0], // Return first error
    });
  }

  const { guests, specialRequest, contactPhone } = req.body;

  // Handle date/slot changes for table bookings
  if ((date || slot) && reservation.tableNumber && reservation.tableNumber.length > 0) {
    try {
      for (const tableNum of reservation.tableNumber) {
        const table = await Table.findOne({ tableNumber: parseInt(tableNum) });
        if (table) {
          // Remove old booking
          await removeTableBooking(table, reservation.date, reservation.slot);
          // Add new booking with updated date/slot
          const newDate = date || reservation.date;
          const newSlot = slot || reservation.slot;
          await addTableBooking(table, newDate, newSlot);
          console.log(`Updated table ${tableNum} booking from ${reservation.date}/${reservation.slot} to ${newDate}/${newSlot}`);
        }
      }
    } catch (error) {
      console.error('Error updating table bookings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating table bookings',
      });
    }
  }

  // Validate input if provided
  const updateData = {};
  if (date) updateData.date = date;
  if (slot) updateData.slot = slot;
  if (guests) updateData.guests = guests;
  if (specialRequest !== undefined) updateData.specialRequest = specialRequest;
  if (contactPhone) updateData.contactPhone = contactPhone;
  updateData.updatedAt = new Date();

  const updatedReservation = await Reservation.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('userId', 'name email phone');

  res.status(200).json({
    success: true,
    message: 'Reservation updated successfully',
    data: updatedReservation,
  });
});

// @desc    Cancel user's own reservation
// @route   DELETE /api/reservations/:id
// @access  Private
const cancelUserReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return res.status(404).json({
      success: false,
      message: 'Reservation not found',
    });
  }

  if (reservation.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this reservation',
    });
  }

  // Check if reservation can be cancelled
  if (reservation.status === 'cancelled' || reservation.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Reservation is already cancelled or completed',
    });
  }

  if (reservation.status !== 'confirmed') {
    return res.status(400).json({
      success: false,
      message: 'Only confirmed reservations can be cancelled',
    });
  }

  // Use helper to validate cancellation time constraints
  const cancellationCheck = canCancelReservation(reservation.date, reservation.slot);
  if (!cancellationCheck.canCancel) {
    return res.status(400).json({
      success: false,
      message: cancellationCheck.message,
    });
  }

  reservation.status = 'cancelled';
  reservation.updatedAt = new Date();
  await reservation.save();

  // If tableNumber array is assigned, remove table bookings
  if (reservation.tableNumber && reservation.tableNumber.length > 0) {
    try {
      for (const tableNum of reservation.tableNumber) {
        const table = await Table.findOne({ tableNumber: parseInt(tableNum) });
        if (table) {
          await removeTableBooking(table, reservation.date, reservation.slot);
          console.log(`Table ${tableNum} booking removed for cancelled reservation ${reservation._id}`);
        } else {
          console.warn(`Table ${tableNum} not found when cancelling reservation`);
        }
      }
    } catch (error) {
      console.error('Error removing table bookings:', error);
    }
  }

  // Update user statistics (decrement totalReservations)
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        totalReservations: -1,
      },
    });
    console.log('User statistics updated for cancelled reservation');
  } catch (error) {
    console.error('Error updating user statistics:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Reservation cancelled successfully',
    data: reservation,
  });
});

module.exports = {
  createReservation,
  getUserReservations,
  getAdminReservations,
  updateAdminReservation,
  updateUserReservation,
  cancelUserReservation,
  getReservationStats,
};