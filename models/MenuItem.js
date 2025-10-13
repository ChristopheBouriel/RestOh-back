const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a menu item name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative'],
  },
  image: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: {
      values: ['appetizer', 'main', 'dessert', 'beverage'],
      message: 'Category must be appetizer, main, dessert, or beverage',
    },
  },
  cuisine: {
    type: String,
    enum: {
      values: ['asian', 'lao', 'continental'],
      message: 'Please select a valid cuisine type',
    },
    default: null,
  },
  isVegetarian: {
    type: Boolean,
    default: null,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  ingredients: [{
    type: String,
    trim: true,
  }],
  allergens: [{
    type: String,
    trim: true,

  }],
  preparationTime: {
    type: Number, // in minutes
    default: 15,
    min: [1, 'Preparation time must be at least 1 minute'],
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  reviews: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: [200, 'Review cannot be more than 200 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isPopular: {
    type: Boolean,
    default: false,
  },
  orderCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Create index for search functionality
MenuItemSchema.index({ name: 'text', description: 'text' });

// Calculate average rating
MenuItemSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.rating.average = Math.round((sum / this.reviews.length) * 10) / 10;
    this.rating.count = this.reviews.length;
  }
  return this.save();
};

module.exports = mongoose.model('MenuItem', MenuItemSchema);