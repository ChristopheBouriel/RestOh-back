const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const MenuItem = require('../../models/MenuItem');

const createTestUser = async (userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
  };

  const user = await User.create({ ...defaultUser, ...userData });
  return user;
};

const createTestAdmin = async (userData = {}) => {
  const defaultAdmin = {
    name: 'Test Admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
  };

  const admin = await User.create({ ...defaultAdmin, ...userData });
  return admin;
};

const createTestMenuItem = async (itemData = {}) => {
  const defaultItem = {
    name: 'Test Item',
    description: 'Test description',
    price: 10.99,
    category: 'main',
    cuisine: 'asian',
    image: 'test-image.jpg',
    isAvailable: true,
  };

  const menuItem = await MenuItem.create({ ...defaultItem, ...itemData });
  return menuItem;
};

const generateAuthToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

const mockRequest = (overrides = {}) => {
  const req = {
    body: {},
    params: {},
    query: {},
    user: null,
    headers: {},
    ...overrides,
  };

  return req;
};

const mockResponse = () => {
  const res = {
    statusCode: 200,
    headers: {},
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.data = data;
    return res;
  });
  res.send = jest.fn((data) => {
    res.data = data;
    return res;
  });
  res.set = jest.fn(() => res);
  res.cookie = jest.fn(() => res);
  return res;
};

const mockNext = () => jest.fn();

module.exports = {
  createTestUser,
  createTestAdmin,
  createTestMenuItem,
  generateAuthToken,
  mockRequest,
  mockResponse,
  mockNext,
};