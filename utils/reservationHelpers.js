const { getTimeFromSlot } = require('./timeSlots');

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

module.exports = {
  createReservationDateTime,
  getHoursDifference,
  canModifyReservation,
  isValidNewReservationTime,
  canCancelReservation,
  validateReservationUpdate
};