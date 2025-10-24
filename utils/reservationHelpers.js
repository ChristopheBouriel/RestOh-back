const { getTimeFromSlot } = require('./timeSlots');
const Table = require('../models/Table');

/**
 * Create a Date object from reservation date and slot number
 * @param {Date|string} date - Reservation date
 * @param {number} slotNumber - Slot number
 * @returns {Date|null} Complete datetime or null if invalid slot
 */
const createReservationDateTime = (date, slotNumber) => {
  const timeComponents = getTimeFromSlot(slotNumber);
  if (!timeComponents) return null;

  const reservationDate = new Date(date);
  reservationDate.setHours(timeComponents.hours, timeComponents.minutes, 0, 0);

  return reservationDate;
};

/**
 * Calculate hours between two dates
 * @param {Date} laterDate - Later date
 * @param {Date} earlierDate - Earlier date
 * @returns {number} Hours difference (can be negative if laterDate is before earlierDate)
 */
const getHoursDifference = (laterDate, earlierDate) => {
  return (laterDate.getTime() - earlierDate.getTime()) / (1000 * 60 * 60);
};

/**
 * Check if reservation can be modified (1 hour before original time rule)
 * @param {Date|string} originalDate - Original reservation date
 * @param {number} originalSlot - Original slot number
 * @param {Date} now - Current time (for testing purposes)
 * @returns {object} { canModify: boolean, hoursUntil: number, message?: string }
 */
const canModifyReservation = (originalDate, originalSlot, now = new Date()) => {
  const originalDateTime = createReservationDateTime(originalDate, originalSlot);

  if (!originalDateTime) {
    return {
      canModify: false,
      hoursUntil: 0,
      message: 'Invalid original slot time'
    };
  }

  const hoursUntil = getHoursDifference(originalDateTime, now);

  if (hoursUntil < 1) {
    return {
      canModify: false,
      hoursUntil,
      message: 'Cannot modify reservation less than 1 hour before the original time'
    };
  }

  return {
    canModify: true,
    hoursUntil
  };
};

/**
 * Check if new reservation time is valid (1 hour from now rule)
 * @param {Date|string} newDate - New reservation date
 * @param {number} newSlot - New slot number
 * @param {Date} now - Current time (for testing purposes)
 * @returns {object} { isValid: boolean, hoursUntil: number, message?: string }
 */
const isValidNewReservationTime = (newDate, newSlot, now = new Date()) => {
  const newDateTime = createReservationDateTime(newDate, newSlot);

  if (!newDateTime) {
    return {
      isValid: false,
      hoursUntil: 0,
      message: 'Invalid new slot time'
    };
  }

  const hoursUntil = getHoursDifference(newDateTime, now);

  if (hoursUntil < 1) {
    return {
      isValid: false,
      hoursUntil,
      message: 'New reservation time must be at least 1 hour from now'
    };
  }

  return {
    isValid: true,
    hoursUntil
  };
};

/**
 * Check if reservation can be cancelled (2 hours before rule)
 * @param {Date|string} reservationDate - Reservation date
 * @param {number} slotNumber - Slot number
 * @param {Date} now - Current time (for testing purposes)
 * @returns {object} { canCancel: boolean, hoursUntil: number, message?: string }
 */
const canCancelReservation = (reservationDate, slotNumber, now = new Date()) => {
  const reservationDateTime = createReservationDateTime(reservationDate, slotNumber);

  if (!reservationDateTime) {
    return {
      canCancel: false,
      hoursUntil: 0,
      message: 'Invalid reservation slot time'
    };
  }

  const hoursUntil = getHoursDifference(reservationDateTime, now);

  if (hoursUntil < 2) {
    return {
      canCancel: false,
      hoursUntil,
      message: 'Reservations can only be cancelled at least 2 hours in advance'
    };
  }

  return {
    canCancel: true,
    hoursUntil
  };
};

/**
 * Validate reservation update request
 * @param {object} reservation - Current reservation object
 * @param {object} updateData - Data to update { date?, slot?, ... }
 * @param {Date} now - Current time (for testing purposes)
 * @returns {object} { isValid: boolean, errors: string[] }
 */
const validateReservationUpdate = (reservation, updateData, now = new Date()) => {
  const errors = [];

  // Check if we can modify the original reservation
  const modifyCheck = canModifyReservation(reservation.date, reservation.slot, now);
  if (!modifyCheck.canModify) {
    errors.push(modifyCheck.message);
  }

  // If changing date or slot, validate new time
  if ((updateData.date || updateData.slot) && modifyCheck.canModify) {
    const newDate = updateData.date || reservation.date;
    const newSlot = updateData.slot || reservation.slot;

    const newTimeCheck = isValidNewReservationTime(newDate, newSlot, now);
    if (!newTimeCheck.isValid) {
      errors.push(newTimeCheck.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// === TABLE BOOKING BUSINESS LOGIC ===

/**
 * Get bookings for a specific date from a table document
 * @param {object} table - Table document
 * @param {Date|string} date - Target date
 * @returns {object|null} Booking object or null if not found
 */
const getTableBookingsForDate = (table, date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return table.tableBookings.find(booking => {
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate.getTime() === targetDate.getTime();
  });
};

/**
 * Check if a slot is available for a specific date on a table
 * @param {object} table - Table document
 * @param {Date|string} date - Target date
 * @param {number} slot - Slot number
 * @returns {boolean} True if slot is available
 */
const isTableSlotAvailable = (table, date, slot) => {
  const booking = getTableBookingsForDate(table, date);
  if (!booking) return true;

  // Check if any of the 3 consecutive slots are already booked
  return !booking.bookedSlots.includes(slot) &&
         !booking.bookedSlots.includes(slot + 1) &&
         !booking.bookedSlots.includes(slot + 2);
};

/**
 * Add booking for a specific date and slot to a table
 * @param {object} table - Table document
 * @param {Date|string} date - Target date
 * @param {number} slot - Slot number
 * @returns {Promise} Save operation promise
 */
const addTableBooking = async (table, date, slot) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  let booking = getTableBookingsForDate(table, targetDate);

  let slots = [slot, slot + 1, slot + 2];

  if (!booking) {
    booking = {
      date: targetDate,
      bookedSlots: slots
    };
    table.tableBookings.push(booking);
  } else {
    if (!booking.bookedSlots.includes(slot) && !booking.bookedSlots.includes(slot + 1) && !booking.bookedSlots.includes(slot + 2)) {
      booking.bookedSlots.push(...slots);
      booking.bookedSlots.sort();
    }
  }

  return table.save();
};

/**
 * Remove booking for a specific date and slot from a table
 * @param {object} table - Table document
 * @param {Date|string} date - Target date
 * @param {number} slot - Slot number
 * @returns {Promise} Save operation promise
 */
const removeTableBooking = async (table, date, slot) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const booking = getTableBookingsForDate(table, targetDate);

  if (booking) {
    booking.bookedSlots = booking.bookedSlots.filter(s => s !== slot && s !== slot + 1 && s !== slot + 2);

    if (booking.bookedSlots.length === 0) {
      table.tableBookings = table.tableBookings.filter(b =>
        new Date(b.date).getTime() !== targetDate.getTime()
      );
    }
  }

  return table.save();
};

/**
 * Find available tables for a specific date and slot
 * @param {Date|string} date - Target date
 * @param {number} slot - Slot number
 * @param {number} requiredCapacity - Minimum table capacity required
 * @returns {Promise<Array>} Array of available table documents
 */
const findAvailableTables = async (date, slot, requiredCapacity = 1) => {
  const tables = await Table.find({
    isActive: true,
    // TODO add business logic, for now we do noy care about capacity
    capacity: { $gte: 1 }
  });

  const availableTables = tables.filter(table => isTableSlotAvailable(table, date, slot)).map(table => table.tableNumber);
  const allTables = Array(12).fill().map((_, index) => index + 1);
  const occupiedTables = allTables.filter(x => !availableTables.includes(x));
  return {
    availableTables,
    occupiedTables
  }
};

/**
 * Get table availability for a specific date
 * @param {Date|string} date - Target date
 * @returns {Promise<Array>} Array of availability information for all active tables
 */
const getTableAvailability = async (date) => {
  const tables = await Table.find({ isActive: true }).sort({ tableNumber: 1 });

  return tables.map(table => {
    const booking = getTableBookingsForDate(table, date);
    const bookedSlots = booking ? booking.bookedSlots : [];
    const availableSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(slot =>
      isTableSlotAvailable(table, date, slot)
    );

    return {
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      bookedSlots,
      availableSlots,
      isFullyBooked: availableSlots.length === 0
    };
  });
};

module.exports = {
  createReservationDateTime,
  getHoursDifference,
  canModifyReservation,
  isValidNewReservationTime,
  canCancelReservation,
  validateReservationUpdate,
  getTableBookingsForDate,
  isTableSlotAvailable,
  addTableBooking,
  removeTableBooking,
  findAvailableTables,
  getTableAvailability
};