const mongoose = require('mongoose');

const tableBookingSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  bookedSlots: {
    type: [Number],
    default: [],
    validate: {
      validator: function(slots) {
        return slots.every(slot => slot >= 1 && slot <= 9);
      },
      message: 'Invalid slot number. Slots must be between 1 and 9.'
    }
  }
}, {
  _id: false
});

const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: [true, 'Table number is required'],
    unique: true,
    min: [1, 'Table number must be at least 1'],
    max: [22, 'Table number cannot exceed 22']
  },
  tableBookings: {
    type: [tableBookingSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  capacity: {
    type: Number,
    default: 4,
    min: [1, 'Table capacity must be at least 1'],
    max: [12, 'Table capacity cannot exceed 12']
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Table', tableSchema);