const fs = require('fs');
const path = require('path');

// File paths for persistent storage
const USERS_FILE = path.join(__dirname, '../data/users.json');
const ORDERS_FILE = path.join(__dirname, '../data/orders.json');
const RESERVATIONS_FILE = path.join(__dirname, '../data/reservations.json');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
const initializeFile = (filePath, defaultData = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
};

// Initialize all files
initializeFile(USERS_FILE, []);
initializeFile(ORDERS_FILE, []);
initializeFile(RESERVATIONS_FILE, []);

// Generic file operations
const readFromFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading from ${filePath}:`, error);
    return [];
  }
};

const writeToFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
};

// User operations
const getUsers = () => readFromFile(USERS_FILE);

const saveUsers = (users) => writeToFile(USERS_FILE, users);

const addUser = (user) => {
  const users = getUsers();
  users.push(user);
  return saveUsers(users);
};

const findUserByEmail = (email) => {
  const users = getUsers();
  return users.find(user => user.email === email);
};

const findUserById = (id) => {
  const users = getUsers();
  return users.find(user => user.id === id || user._id === id);
};

const updateUser = (id, updateData) => {
  const users = getUsers();
  const userIndex = users.findIndex(user => user.id === id || user._id === id);
  
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...updateData, updatedAt: new Date() };
    return saveUsers(users) ? users[userIndex] : null;
  }
  return null;
};

// Order operations
const getOrders = () => readFromFile(ORDERS_FILE);

const saveOrders = (orders) => writeToFile(ORDERS_FILE, orders);

const addOrder = (order) => {
  const orders = getOrders();
  orders.unshift(order); // Add to beginning for newest first
  return saveOrders(orders);
};

const findOrderById = (id) => {
  const orders = getOrders();
  return orders.find(order => order._id === id || order.id === id);
};

const updateOrder = (id, updateData) => {
  const orders = getOrders();
  const orderIndex = orders.findIndex(order => order._id === id || order.id === id);
  
  if (orderIndex !== -1) {
    orders[orderIndex] = { ...orders[orderIndex], ...updateData, updatedAt: new Date() };
    return saveOrders(orders) ? orders[orderIndex] : null;
  }
  return null;
};

const getUserOrders = (userId) => {
  const orders = getOrders();
  return orders.filter(order => 
    order.user._id === userId || 
    order.user._id === userId.toString() ||
    order.user.id === userId ||
    order.user.id === userId.toString()
  );
};

// Reservation operations
const getReservations = () => readFromFile(RESERVATIONS_FILE);

const saveReservations = (reservations) => writeToFile(RESERVATIONS_FILE, reservations);

const addReservation = (reservation) => {
  const reservations = getReservations();
  reservations.unshift(reservation); // Add to beginning for newest first
  return saveReservations(reservations);
};

const findReservationById = (id) => {
  const reservations = getReservations();
  return reservations.find(reservation => reservation._id === id || reservation.id === id);
};

const updateReservation = (id, updateData) => {
  const reservations = getReservations();
  const reservationIndex = reservations.findIndex(reservation => reservation._id === id || reservation.id === id);
  
  if (reservationIndex !== -1) {
    reservations[reservationIndex] = { ...reservations[reservationIndex], ...updateData, updatedAt: new Date() };
    return saveReservations(reservations) ? reservations[reservationIndex] : null;
  }
  return null;
};

const getUserReservations = (userId) => {
  const reservations = getReservations();
  return reservations.filter(reservation => 
    reservation.user._id === userId || 
    reservation.user._id === userId.toString() ||
    reservation.user.id === userId ||
    reservation.user.id === userId.toString()
  );
};

// Statistics
const getUserStats = () => {
  const users = getUsers();
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    totalUsers: users.length,
    activeUsers: users.filter(user => user.isActive !== false).length,
    adminUsers: users.filter(user => user.role === 'admin').length,
    regularUsers: users.filter(user => user.role === 'user').length,
    newUsers: users.filter(user => new Date(user.createdAt) >= thisMonth).length,
  };
};

const getOrderStats = () => {
  const orders = getOrders();
  
  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter(order => order.status === 'pending').length,
    confirmedOrders: orders.filter(order => order.status === 'confirmed').length,
    preparingOrders: orders.filter(order => order.status === 'preparing').length,
    readyOrders: orders.filter(order => order.status === 'ready').length,
    deliveredOrders: orders.filter(order => order.status === 'delivered').length,
    cancelledOrders: orders.filter(order => order.status === 'cancelled').length,
    totalRevenue: orders
      .filter(order => order.status === 'delivered')
      .reduce((total, order) => total + (order.totalAmount || 0), 0),
  };
};

const getReservationStats = () => {
  const reservations = getReservations();
  
  return {
    totalReservations: reservations.length,
    pendingReservations: reservations.filter(res => res.status === 'pending').length,
    confirmedReservations: reservations.filter(res => res.status === 'confirmed').length,
    seatedReservations: reservations.filter(res => res.status === 'seated').length,
    completedReservations: reservations.filter(res => res.status === 'completed').length,
    cancelledReservations: reservations.filter(res => res.status === 'cancelled').length,
  };
};

module.exports = {
  // User operations
  getUsers,
  saveUsers,
  addUser,
  findUserByEmail,
  findUserById,
  updateUser,
  
  // Order operations
  getOrders,
  saveOrders,
  addOrder,
  findOrderById,
  updateOrder,
  getUserOrders,
  
  // Reservation operations
  getReservations,
  saveReservations,
  addReservation,
  findReservationById,
  updateReservation,
  getUserReservations,
  
  // Statistics
  getUserStats,
  getOrderStats,
  getReservationStats,
};