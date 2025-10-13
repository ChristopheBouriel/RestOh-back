const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Reservation must belong to a user'],
  },
  reservationNumber: {
    type: String,
    unique: true,
  },
  date: {
    type: Date,
    required: [true, 'Please add a reservation date'],
    validate: {
      validator: function(value) {
        return value >= new Date().setHours(0, 0, 0, 0);
      },
      message: 'Reservation date cannot be in the past',
    },
  },
  time: {
    type: String,
    required: [true, 'Please add a reservation time'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add a valid time format (HH:MM)'],
  },
  guests: {
    type: Number,
    required: [true, 'Please add number of guests'],
    min: [1, 'Number of guests must be at least 1'],
    max: [20, 'Number of guests cannot exceed 20'],
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'],
      message: 'Please select a valid status',
    },
    default: 'pending',
  },
  tableNumber: {
    type: Number,
    min: [1, 'Table number must be at least 1'],
    max: [50, 'Table number cannot exceed 50'],
    default: null,
  },
  specialRequest: {
    type: String,
    maxlength: [200, 'Special request cannot exceed 200 characters'],
    default: null,
  },
  occasion: {
    type: String,
    enum: {
      values: ['birthday', 'anniversary', 'date', 'business', 'family', 'celebration', 'other'],
      message: 'Please select a valid occasion'
    },
    default: null,
  },
  contactPhone: {
    type: String,
    required: [true, 'Please add a contact phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid phone number'],
  },
  contactEmail: {
    type: String,
    required: [true, 'Please add a contact email'],
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  preferences: {
    seating: {
      type: String,
      enum: ['indoor', 'outdoor', 'window', 'private', 'no-preference'],
      default: 'no-preference',
    },
    accessibility: {
      type: Boolean,
      default: false,
    },
    highChair: {
      type: Boolean,
      default: false,
    },
  },
  notes: {
    type: String,
    maxlength: [300, 'Notes cannot exceed 300 characters'],
    default: null,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  checkedIn: {
    type: Boolean,
    default: false,
  },
  checkedInAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5'],
    default: null,
  },
  review: {
    type: String,
    maxlength: [300, 'Review cannot exceed 300 characters'],
    default: null,
  },
}, {
  timestamps: true,
});

// Create compound index for date and time to prevent double booking
ReservationSchema.index({ date: 1, time: 1, tableNumber: 1 }, { unique: true, sparse: true });

// Generate reservation number before saving
ReservationSchema.pre('save', function(next) {
  if (!this.reservationNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.reservationNumber = `RES-${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Check if reservation time is valid (restaurant hours)
ReservationSchema.methods.isValidTime = function() {
  const [hours, minutes] = this.time.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  // Restaurant hours: 11:00 AM to 11:00 PM
  const openTime = 11 * 60; // 11:00 AM
  const closeTime = 23 * 60; // 11:00 PM
  
  return timeInMinutes >= openTime && timeInMinutes <= closeTime;
};

// Check in customer
ReservationSchema.methods.checkIn = function() {
  this.checkedIn = true;
  this.checkedInAt = new Date();
  this.status = 'seated';
  return this.save();
};

// Complete reservation
ReservationSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Reservation', ReservationSchema);