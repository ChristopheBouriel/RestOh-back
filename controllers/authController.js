const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validateRegister, validateLogin } = require('../utils/validation');
const fileStorage = require('../utils/fileStorage');

// Temporary in-memory user store for testing when DB is not available
let tempUsers = [];
let tempUserId = 1;

// Create default admin user if not exists
const createDefaultAdmin = () => {
  const adminExists = tempUsers.find(u => u.email === 'admin@restoh.com');
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    bcrypt.hash('admin123', 10).then(hashedPassword => {
      tempUsers.push({
        id: tempUserId++,
        name: 'Admin User',
        email: 'admin@restoh.com',
        password: hashedPassword,
        phone: '9876543210',
        role: 'admin',
        createdAt: new Date(),
      });
      console.log('🔐 Default admin created: admin@restoh.com / admin123');
    });
  }
};

// Initialize default admin
createDefaultAdmin();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  // Validate input
  const { error } = validateRegister(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { name, email, password, phone } = req.body;

  try {
    // Try to use MongoDB first
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
    });

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (dbError) {
    // Fallback to persistent file storage
    console.log('Database unavailable, using persistent file storage...');

    try {
      // Check if user already exists in file storage
      const existingUser = fileStorage.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      // Create user with persistent storage
      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        id: tempUserId++,
        _id: String(tempUserId),
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to persistent file storage
      const saved = fileStorage.addUser(newUser);

      if (!saved) {
        throw new Error('Failed to save user to file storage');
      }

      // Also add to temp storage for backward compatibility
      tempUsers.push(newUser);

      // Generate token
      const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
      });

      console.log(`✅ User registered successfully: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (fileError) {
      console.error('File storage error:', fileError);

      // Final fallback to temp storage only
      const existingTempUser = tempUsers.find(u => u.email === email);
      if (existingTempUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const tempUser = {
        id: tempUserId++,
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'user',
        createdAt: new Date(),
      };

      tempUsers.push(tempUser);

      const token = jwt.sign({ id: tempUser.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully (temp storage)',
        token,
        user: {
          id: tempUser.id,
          name: tempUser.name,
          email: tempUser.email,
          role: tempUser.role,
        },
      });
    }
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  // Validate input
  const { error } = validateLogin(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { email, password } = req.body;

  try {
    // Try to use MongoDB first
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (dbError) {
    // Fallback to persistent file storage
    console.log('Database unavailable, using persistent file storage for login...');

    try {
      // Check file storage first
      const fileUser = fileStorage.findUserByEmail(email);

      if (fileUser) {
        // Check password
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, fileUser.password);

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
          });
        }

        // Update last login in file storage
        const updatedUser = fileStorage.updateUser(fileUser.id, { lastLogin: new Date() });

        // Generate token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: fileUser.id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRE,
        });

        console.log(`✅ User logged in successfully: ${email}`);

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: fileUser.id,
            name: fileUser.name,
            email: fileUser.email,
            role: fileUser.role,
            lastLogin: updatedUser?.lastLogin || new Date(),
          },
        });
      }
    } catch (fileError) {
      console.error('File storage error during login:', fileError);
    }

    // Final fallback to temp storage
    console.log('Using temp storage for login...');
    const tempUser = tempUsers.find(u => u.email === email);

    if (!tempUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, tempUser.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    tempUser.lastLogin = new Date();

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: tempUser.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful (temp storage)',
      token,
      user: {
        id: tempUser.id,
        name: tempUser.name,
        email: tempUser.email,
        role: tempUser.role,
        lastLogin: tempUser.lastLogin,
      },
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (dbError) {
    // Fallback to temp storage
    const tempUser = tempUsers.find(u => u.id === req.user.id);
    if (!tempUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { password, ...userWithoutPassword } = tempUser;
    res.status(200).json({
      success: true,
      user: userWithoutPassword,
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    phone: req.body.phone,
    address: req.body.address,
    preferences: req.body.preferences,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user,
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current password and new password',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters',
    });
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Export temp users for middleware access
const getTempUsers = () => tempUsers;

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  getTempUsers,
};