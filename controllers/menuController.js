const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../utils/asyncHandler');
const { menuSchema } = require('../utils/validation');
const { getImageUrl, deleteUploadedFile } = require('../middleware/imageUpload');

// Temporary in-memory menu items for testing
let tempMenuItems = [
  {
    _id: '1',
    name: 'Butter Chicken',
    description: 'Tender chicken in a rich, creamy tomato-based sauce with aromatic spices',
    price: 450,
    category: 'main',
    cuisine: 'indian',
    isVegetarian: false,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
    spiceLevel: 'medium',
    isAvailable: true,
    orderCount: 0,
    rating: { average: 0, count: 0 },
    reviews: [],
    createdAt: new Date(),
  },
  {
    _id: '2',
    name: 'Paneer Tikka Masala',
    description: 'Grilled cottage cheese cubes in a flavorful tomato and onion gravy',
    price: 380,
    category: 'main',
    cuisine: 'indian',
    isVegetarian: true,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
    spiceLevel: 'mild',
    isAvailable: true,
    orderCount: 0,
    rating: { average: 0, count: 0 },
    reviews: [],
    createdAt: new Date(),
  },
  {
    _id: '3',
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella, tomatoes, and basil',
    price: 520,
    category: 'main',
    cuisine: 'italian',
    isVegetarian: true,
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
    spiceLevel: 'mild',
    isAvailable: true,
    orderCount: 0,
    rating: { average: 0, count: 0 },
    reviews: [],
    createdAt: new Date(),
  },
  {
    _id: '4',
    name: 'Chicken Biryani',
    description: 'Fragrant basmati rice layered with spiced chicken and aromatic herbs',
    price: 480,
    category: 'main',
    cuisine: 'indian',
    isVegetarian: false,
    image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400',
    spiceLevel: 'medium',
    isAvailable: true,
    orderCount: 0,
    rating: { average: 0, count: 0 },
    reviews: [],
    createdAt: new Date(),
  },
  {
    _id: '5',
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce with parmesan cheese, croutons, and Caesar dressing',
    price: 320,
    category: 'appetizer',
    cuisine: 'continental',
    isVegetarian: true,
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
    spiceLevel: 'mild',
    isAvailable: true,
    orderCount: 0,
    rating: { average: 0, count: 0 },
    reviews: [],
    createdAt: new Date(),
  },
  {
    _id: '6',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream',
    price: 280,
    category: 'dessert',
    cuisine: 'continental',
    isVegetarian: true,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400',
    spiceLevel: 'mild',
    isAvailable: true,
    orderCount: 0,
    rating: { average: 0, count: 0 },
    reviews: [],
    createdAt: new Date(),
  },
];

let tempMenuItemId = 7;

// @desc    Get all menu items
// @route   GET /api/menu
// @access  Public
const getMenuItems = asyncHandler(async (req, res) => {
  try {
    // Try MongoDB first
    let query = {};

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by cuisine
    if (req.query.cuisine) {
      query.cuisine = req.query.cuisine;
    }

    // Filter by vegetarian
    if (req.query.vegetarian) {
      query.isVegetarian = req.query.vegetarian === 'true';
    }

    // Filter by availability
    /*if (req.query.available !== undefined) {
      query.isAvailable = req.query.available === 'true';
    } else {
      query.isAvailable = true; // Default to available items only
    }*/

    // Search functionality
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) {
        query.price.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        query.price.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Sorting
    let sortBy = {};
    if (req.query.sort) {
      const sortField = req.query.sort;
      const sortOrder = req.query.order === 'desc' ? -1 : 1;
      sortBy[sortField] = sortOrder;
    } else {
      sortBy = { createdAt: -1 }; // Default sort by newest
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const total = await MenuItem.countDocuments(query);
    const menuItems = await MenuItem.find(query)
      .sort(sortBy)
      .limit(limit)
      .skip(startIndex);

    // Pagination result
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
  } catch (dbError) {
    // Fallback to temp storage
    console.log('Using temp storage for menu items...');

    let filteredItems = [...tempMenuItems];

    // Apply filters
    if (req.query.category) {
      filteredItems = filteredItems.filter(item => item.category === req.query.category);
    }
    if (req.query.cuisine) {
      filteredItems = filteredItems.filter(item => item.cuisine === req.query.cuisine);
    }
    if (req.query.vegetarian) {
      filteredItems = filteredItems.filter(item => item.isVegetarian === (req.query.vegetarian === 'true'));
    }
    if (req.query.available !== undefined) {
      filteredItems = filteredItems.filter(item => item.isAvailable === (req.query.available === 'true'));
    } else {
      filteredItems = filteredItems.filter(item => item.isAvailable === true);
    }
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
      );
    }
    if (req.query.minPrice) {
      filteredItems = filteredItems.filter(item => item.price >= parseFloat(req.query.minPrice));
    }
    if (req.query.maxPrice) {
      filteredItems = filteredItems.filter(item => item.price <= parseFloat(req.query.maxPrice));
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    const total = filteredItems.length;

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
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
      count: paginatedItems.length,
      total,
      pagination,
      data: paginatedItems,
    });
  }
});

// @desc    Get single menu item
// @route   GET /api/menu/:id
// @access  Public
const getMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id).populate('reviews.user', 'name avatar');

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

// @desc    Create menu item
// @route   POST /api/menu
// @access  Private/Admin
const createMenuItem = asyncHandler(async (req, res) => {
  // Parse JSON arrays from FormData
  if (req.body.allergens && typeof req.body.allergens === 'string') {
    try {
      req.body.allergens = JSON.parse(req.body.allergens);
    } catch (e) {
      req.body.allergens = [];
    }
  }
  if (req.body.ingredients && typeof req.body.ingredients === 'string') {
    try {
      req.body.ingredients = JSON.parse(req.body.ingredients);
    } catch (e) {
      req.body.ingredients = [];
    }
  }

  // Handle uploaded image
  if (req.file) {
    req.body.image = getImageUrl(req, req.file.filename);
  }

  const { error } = menuSchema.validate(req.body);
  if (error) {
    // Clean up uploaded file if validation fails
    if (req.file) {
      deleteUploadedFile(req.file.filename);
    }
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const menuItem = await MenuItem.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem,
    });
  } catch (dbError) {
    // Fallback to temp storage
    console.log('Using temp storage for creating menu item...');

    const newMenuItem = {
      _id: tempMenuItemId++,
      ...req.body,
      orderCount: 0,
      rating: { average: 0, count: 0 },
      reviews: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tempMenuItems.push(newMenuItem);

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully (temp storage)',
      data: newMenuItem,
    });
  }
});

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
const updateMenuItem = asyncHandler(async (req, res) => {
  try {
    // Parse JSON arrays from FormData
    if (req.body.allergens && typeof req.body.allergens === 'string') {
      try {
        req.body.allergens = JSON.parse(req.body.allergens);
      } catch (e) {
        req.body.allergens = [];
      }
    }
    if (req.body.ingredients && typeof req.body.ingredients === 'string') {
      try {
        req.body.ingredients = JSON.parse(req.body.ingredients);
      } catch (e) {
        req.body.ingredients = [];
      }
    }

    let menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      // Clean up uploaded file if item not found
      if (req.file) {
        deleteUploadedFile(req.file.filename);
      }
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Handle uploaded image
    let oldImageFilename = null;
    if (req.file) {
      // Extract old filename to delete it later
      if (menuItem.image && menuItem.image.includes('/uploads/menu-items/')) {
        oldImageFilename = menuItem.image.split('/').pop();
      }
      req.body.image = getImageUrl(req, req.file.filename);
    }

    const toUpdate = Object.keys(req.body);
    if(toUpdate.length < 1 && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nothing to modify',
      });
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
          message: errors,
        });
    }

    menuItem = await MenuItem.findByIdAndUpdate(req.params.id, { $set: req.body }, {
      new: true,
      runValidators: true,
    });

    // Delete old image file if new image was uploaded
    if (oldImageFilename) {
      deleteUploadedFile(oldImageFilename);
    }

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem,
    });
  } catch (dbError) {
    // Fallback to temp storage
    console.log('Using temp storage for updating menu item...');

    const itemIndex = tempMenuItems.findIndex(item => item._id == req.params.id);

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Validate input if provided
    if (Object.keys(req.body).length > 0) {
      const { error } = validateMenuItem(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }
    }

    // Update the item
    tempMenuItems[itemIndex] = {
      ...tempMenuItems[itemIndex],
      ...req.body,
      updatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully (temp storage)',
      data: tempMenuItems[itemIndex],
    });
  }
});

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
const deleteMenuItem = asyncHandler(async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (dbError) {
    // Fallback to temp storage
    console.log('Using temp storage for deleting menu item...');

    const itemIndex = tempMenuItems.findIndex(item => item._id == req.params.id);

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Remove the item
    tempMenuItems.splice(itemIndex, 1);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully (temp storage)',
    });
  }
});

// @desc    Add review to menu item
// @route   POST /api/menu/:id/reviews
// @access  Private
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a rating between 1 and 5',
    });
  }

  const menuItem = await MenuItem.findById(req.params.id);

  if (!menuItem) {
    return res.status(404).json({
      success: false,
      message: 'Menu item not found',
    });
  }

  // Check if user already reviewed this item
  const existingReview = menuItem.reviews.find(
    review => review.user.toString() === req.user.id
  );

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this item',
    });
  }

  // Add review
  menuItem.reviews.push({
    user: req.user.id,
    rating,
    comment,
  });

  // Calculate new average rating
  await menuItem.calculateAverageRating();

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    data: menuItem,
  });
});

// @desc    Get popular menu items
// @route   GET /api/menu/popular
// @access  Public
const getPopularItems = asyncHandler(async (req, res) => {
  const popularItems = await MenuItem.find({ isAvailable: true })
    .sort({ orderCount: -1, 'rating.average': -1 })
    .limit(8);

  res.status(200).json({
    success: true,
    count: popularItems.length,
    data: popularItems,
  });
});

// Export temp menu items for other controllers
const getTempMenuItems = () => tempMenuItems;

module.exports = {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  addReview,
  getPopularItems,
  getTempMenuItems,
};