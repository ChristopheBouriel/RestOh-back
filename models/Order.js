const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a user'],
  },
  orderNumber: {
    type: String,
    unique: true,
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Please add a menu item'],
    },
    quantity: {
      type: Number,
      required: [true, 'Please add quantity'],
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Please add item price'],
    },
    specialInstructions: {
      type: String,
      maxlength: [100, 'Special instructions cannot exceed 100 characters'],
    },
  }],
  subtotal: {
    type: Number,
    required: [true, 'Please add subtotal'],
    min: [0, 'Subtotal cannot be negative'],
  },
  tax: {
    type: Number,
    required: [true, 'Please add tax amount'],
    min: [0, 'Tax cannot be negative'],
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: [0, 'Delivery fee cannot be negative'],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
  },
  totalPrice: {
    type: Number,
    required: [true, 'Please add total price'],
    min: [0, 'Total price cannot be negative'],
  },
  orderType: {
    type: String,
    required: [true, 'Please specify order type'],
    enum: {
      values: ['pickup', 'delivery'],
      message: 'Order type must be pickup or delivery',
    },
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
      message: 'Please select a valid status',
    },
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'failed', 'refunded'],
      message: 'Please select a valid payment status',
    },
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'stripe'],
    required: [true, 'Please specify payment method'],
  },
  deliveryAddress: {
    street: {
      type: String,
      required: function() {
        return this.orderType === 'delivery';
      },
    },
    city: {
      type: String,
      required: function() {
        return this.orderType === 'delivery';
      },
    },
    state: {
      type: String,
      required: function() {
        return this.orderType === 'delivery';
      },
    },
    zipCode: {
      type: String,
      required: function() {
        return this.orderType === 'delivery';
      },
    },
    phone: {
      type: String,
      required: function() {
        return this.orderType === 'delivery';
      },
      match: [/^[0-9]{10}$/, 'Please add a valid phone number'],
    },
  },
  estimatedDeliveryTime: {
    type: Date,
  },
  actualDeliveryTime: {
    type: Date,
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5'],
  },
  review: {
    type: String,
    maxlength: [300, 'Review cannot exceed 300 characters'],
  },
}, {
  timestamps: true,
});

// Generate order number before saving
OrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Calculate estimated delivery time
OrderSchema.methods.calculateEstimatedDeliveryTime = function() {
  const baseTime = new Date();
  let additionalMinutes = 30; // Base preparation time

  // Add time based on order type
  if (this.orderType === 'delivery') {
    additionalMinutes += 20; // Additional delivery time
  } else if (this.orderType === 'pickup') {
    additionalMinutes += 10; // Additional packaging time
  }

  // Add time based on number of items
  additionalMinutes += this.items.length * 5;

  this.estimatedDeliveryTime = new Date(baseTime.getTime() + additionalMinutes * 60000);
  return this.save();
};

module.exports = mongoose.model('Order', OrderSchema);