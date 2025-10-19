const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../utils/asyncHandler');
const { menuSchema } = require('../utils/validation');
const { deleteImage } = require('../middleware/cloudinaryUpload');

// @desc    Get all menu items with filters and pagination
// @route   GET /api/menu
// @access  Public
const getMenuItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  const { category, vegetarian, search } = req.query;

  let query = {};

  if (category) {
    query.category = category;
  }

  if (vegetarian === 'true') {
    query.isVegetarian = true;
  } else if (vegetarian === 'false') {
    query.isVegetarian = false;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await MenuItem.countDocuments(query);
  const menuItems = await MenuItem.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(startIndex);

  const pagination = {};
  if (startIndex + limit < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: menuItems.length,
    total,
    pagination,
    data: menuItems,
  });
});

// @desc    Get single menu item
// @route   GET /api/menu/:id
// @access  Public
const getMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id);

  if (!menuItem) {
    return res.status(404).json({
      success: false,
      message: 'Menu item not found',
    });
  }

  res.status(200).json({
    success: true,
    data: menuItem,
  });
});

// @desc    Create new menu item
// @route   POST /api/menu
// @access  Private/Admin
const createMenuItem = asyncHandler(async (req, res) => {
  const { error } = menuSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: `Validation error: ${error.details[0].message}`,
    });
  }

  const menuItem = await MenuItem.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Menu item created successfully',
    data: menuItem,
  });
});

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
const updateMenuItem = asyncHandler(async (req, res) => {
  const toUpdate = Object.keys(req.body);
    if(toUpdate.length < 1 && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nothing to modify',
      });
    }

    // Get existing menu item first to check for old image
    const existingMenuItem = await MenuItem.findById(req.params.id);
    if (!existingMenuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // If new image is provided, delete the old one from Cloudinary
    if (req.file && existingMenuItem.cloudinaryPublicId) {
      try {
        await deleteImage(existingMenuItem.cloudinaryPublicId);
        console.log('✅ Old image deleted from Cloudinary');
      } catch (error) {
        console.log('Error deleting old image from Cloudinary:', error);
      }
    }

    //TODO : in case of update of the item description, verify that there is difference (could be inserted in the loop)

    const newValues = Object.values(req.body);
    const errors = [];
    for(let i = 0; i < toUpdate.length; i++) {
      const { error } = menuSchema.extract(toUpdate[i]).validate(newValues[i]);
      if (error) {
        errors.push(error.details[0].message);
      }

    }

    if(errors.length) {
      return res.status(400).json({
          success: false,
          message: `Validation error: ${errors.join(', ')}`,
        });
    }

    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, { $set: req.body }, {
      new: true,
      runValidators: true,
    });

    if (!menuItem) {
    return res.status(404).json({
      success: false,
      message: 'Menu item not found',
    });
  }

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem,
    });
});

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
const deleteMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id);

  if (!menuItem) {
    return res.status(404).json({
      success: false,
      message: 'Menu item not found',
    });
  }

  if (menuItem.cloudinaryPublicId) {
    try {
      await deleteImage(menuItem.cloudinaryPublicId);
    } catch (error) {
      console.log('Error deleting image from Cloudinary:', error);
    }
  }

  await MenuItem.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Menu item deleted successfully',
  });
});

// @desc    Add review to menu item
// @route   POST /api/menu/:id/review
// @access  Private
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5',
    });
  }

  const menuItem = await MenuItem.findById(req.params.id);

  if (!menuItem) {
    return res.status(404).json({
      success: false,
      message: 'Menu item not found',
    });
  }

  const existingReview = menuItem.reviews.find(
    (review) => review.user.toString() === req.user._id.toString()
  );

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this item',
    });
  }

  const newReview = {
    user: req.user._id,
    rating,
    comment,
  };

  menuItem.reviews.push(newReview);
  await menuItem.calculateAverageRating();

  res.status(200).json({
    success: true,
    message: 'Review added successfully',
    data: menuItem,
  });
});

// @desc    Get popular menu items
// @route   GET /api/menu/popular
// @access  Public
const getPopularItems = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 6;

  const popularItems = await MenuItem.find({ isAvailable: true })
    .sort({ orderCount: -1 })
    .limit(limit);

  res.status(200).json({
    success: true,
    count: popularItems.length,
    data: popularItems,
  });
});

module.exports = {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  addReview,
  getPopularItems,
};