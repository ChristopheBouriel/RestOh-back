/**
 * Time slots configuration for reservations
 * Format: { slot: number, label: string }
 * The slot number is sent to/from the frontend
 */

const TIME_SLOTS = [
  { slot: 1, label: '18:00' },
  { slot: 2, label: '18:30' },
  { slot: 3, label: '19:00' },
  { slot: 4, label: '19:30' },
  { slot: 5, label: '20:00' },
  { slot: 6, label: '20:30' },
  { slot: 7, label: '21:00' },
  { slot: 8, label: '21:30' },
  { slot: 9, label: '22:00' }
];

/**
 * Get time label from slot number
 * @param {number} slotNumber - Slot number
 * @returns {string} Time label or 'N/A' if not found
 */
const getLabelFromSlot = (slotNumber) => {
  const slot = TIME_SLOTS.find(s => s.slot === slotNumber);
  return slot ? slot.label : 'N/A';
};

/**
 * Get full slot object from slot number
 * @param {number} slotNumber - Slot number
 * @returns {object|null} Slot object or null if not found
 */
const getSlotByNumber = (slotNumber) => {
  return TIME_SLOTS.find(s => s.slot === slotNumber) || null;
};

/**
 * Validate if slot number exists
 * @param {number} slotNumber - Slot number to validate
 * @returns {boolean} True if valid slot
 */
const isValidSlot = (slotNumber) => {
  return TIME_SLOTS.some(s => s.slot === slotNumber);
};

/**
 * Get all available time slots
 * @returns {Array} Array of all time slots
 */
const getAllTimeSlots = () => {
  return [...TIME_SLOTS];
};

/**
 * Convert slot number to time components (hours, minutes)
 * @param {number} slotNumber - Slot number
 * @returns {object|null} Object with hours and minutes, or null if invalid
 */
const getTimeFromSlot = (slotNumber) => {
  const slot = getSlotByNumber(slotNumber);
  if (!slot) return null;

  const [hours, minutes] = slot.label.split(':');
  return {
    hours: parseInt(hours, 10),
    minutes: parseInt(minutes, 10)
  };
};

module.exports = {
  TIME_SLOTS,
  getLabelFromSlot,
  getSlotByNumber,
  isValidSlot,
  getAllTimeSlots,
  getTimeFromSlot
};