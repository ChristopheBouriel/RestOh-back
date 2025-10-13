const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'Order must belong to a user'],
  },
  userEmail: {
    type: String,
    required: [true, 'Please enter email'],
  },
  userName: {
    type: String,
    required: [true, 'Please enter user name'],
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
      values: ['pending', 'paid'],
      message: 'Please select a valid payment status',
    },
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card'],
    required: [true, 'Please specify payment method'],
  },
  deliveryAddress: {
    type: String,
    required: [true, 'Please enter the delivery address'],
    default: null,
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
    default: null,
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