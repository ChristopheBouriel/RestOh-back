const Joi = require('joi');

// User registration validation
const validateRegister = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  });

  return schema.validate(data);
};

// User login validation
const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  return schema.validate(data);
};

// Menu item validation
const validateMenuItem = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().min(10).max(500).required(),
    price: Joi.number().positive().required(),
    category: Joi.string().valid('appetizer', 'main', 'dessert', 'beverage').required(),
    cuisine: Joi.string().valid('indian', 'chinese', 'italian', 'mexican', 'american', 'continental').required(),
    isVegetarian: Joi.boolean().required(),
    isAvailable: Joi.boolean().optional(),
    ingredients: Joi.array().items(Joi.string()).optional(),
    allergens: Joi.array().items(Joi.string()).optional(),
    spiceLevel: Joi.string().valid('mild', 'medium', 'hot', 'very-hot').optional(),
  });

  return schema.validate(data);
};

// Reservation validation
const validateReservation = (data) => {
  const schema = Joi.object({
    date: Joi.date().min('now').required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    guests: Joi.number().integer().min(1).max(20).required(),
    specialRequest: Joi.string().max(200).allow('').optional(),
    occasion: Joi.string().valid('birthday', 'anniversary', 'date', 'business', 'family', 'celebration', 'other', '').allow('').optional(),
    contactPhone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    contactEmail: Joi.string().email().optional(),
    preferences: Joi.object({
      seating: Joi.string().valid('indoor', 'outdoor', 'window', 'private', 'no-preference').optional(),
      accessibility: Joi.boolean().optional(),
      highChair: Joi.boolean().optional(),
    }).optional(),
  });

  return schema.validate(data);
};

// Order validation
const validateOrder = (data) => {
  const schema = Joi.object({
    items: Joi.array().items(
      Joi.object({
        menuItem: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        specialInstructions: Joi.string().max(100).optional(),
      })
    ).min(1).required(),
    deliveryAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    }).optional(),
    orderType: Joi.string().valid('dine-in', 'takeaway', 'delivery').required(),
  });

  return schema.validate(data);
};

// Contact form validation
const validateContact = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[+]?[0-9\s\-()]{10,15}$/).optional(),
    subject: Joi.string().min(5).max(200).required(),
    message: Joi.string().min(10).max(1000).required(),
  });

  return schema.validate(data);
};

module.exports = {
  validateRegister,
  validateLogin,
  validateMenuItem,
  validateReservation,
  validateOrder,
  validateContact,
};