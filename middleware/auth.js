const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Import temp users from authController
const { getTempUsers } = require('../controllers/authController');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    try {
      // Try to get user from MongoDB first
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }
    } catch (dbError) {
      // Fallback to temp storage
      const tempUsers = getTempUsers();
      const tempUser = tempUsers.find(u => u.id === decoded.id);

      if (!tempUser) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      const { password, ...userWithoutPassword } = tempUser;
      req.user = userWithoutPassword;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };