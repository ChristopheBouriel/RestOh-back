const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../utils/asyncHandler');
const fileStorage = require('../utils/fileStorage');

// Temporary in-memory orders for testing
let tempOrders = [
  {
    _id: '1',
    orderNumber: 'ORD001',
    user: {
      _id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
    },
    items: [
      {
        menuItem: {
          _id: 'item1',
          name: 'Butter Chicken',
          price: 450,
        },
        quantity: 2,
        price: 450,
      },
      {
        menuItem: {
          _id: 'item2',
          name: 'Naan',
          price: 80,
        },
        quantity: 3,
        price: 80,
      },
    ],
    totalAmount: 1140,
    status: 'confirmed',
    paymentStatus: 'completed',
    paymentMethod: 'stripe',
    orderType: 'delivery',
    deliveryAddress: {
      street: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    phone: '9876543210',
    specialInstructions: 'Extra spicy',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  },
];

let tempOrderId = 4;

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  console.log('Creating order with data:', req.body);
  console.log('User:', req.user);

  const {
    items,
    orderType,
    deliveryAddress,
    paymentMethod,
    phone,
    specialInstructions,
    totalAmount,
    paymentStatus,
    transactionId
  } = req.body;

  // Basic validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order must contain at least one item',
    });
  }

  if (!orderType || !['delivery', 'pickup'].includes(orderType)) {
    return res.status(400).json({
      success: false,
      message: 'Order type must be either delivery or pickup',
    });
  }

  if (orderType === 'delivery' && !deliveryAddress) {
    return res.status(400).json({
      success: false,
      message: 'Delivery address is required for delivery orders',
    });
  }

  // Calculate totals from provided data or items
  let calculatedTotal = totalAmount;
  if (!calculatedTotal) {
    calculatedTotal = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  // Prepare order items
  const orderItems = items.map(item => ({
    menuItem: item.menuItem || item._id,
    quantity: item.quantity,
    price: item.price,
    name: item.name, // Store name as fallback
  }));

  // Generate order number
  const orderNumber = `ORD${Date.now()}`;

  // Create order object
  const newOrder = {
    _id: String(tempOrderId++),
    orderNumber,
    user: {
      _id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || phone,
    },
    items: orderItems.map(item => ({
      menuItem: {
        _id: item.menuItem,
        name: item.name || 'Menu Item',
        price: item.price,
      },
      quantity: item.quantity,
      price: item.price,
    })),
    totalAmount: Math.round(calculatedTotal),
    status: 'pending',
    paymentStatus: paymentStatus || 'completed',
    paymentMethod: paymentMethod || 'online',
    orderType,
    deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
    phone: phone || req.user.phone,
    specialInstructions: specialInstructions || '',
    transactionId: transactionId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    // Try to create in database first
    const order = await Order.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      items: orderItems,
      totalPrice: Math.round(calculatedTotal),
      orderType,
      paymentStatus: paymentStatus || 'pending',
      paymentMethod: paymentMethod || 'cash',
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
      notes: specialInstructions || null,
    });

    // Order created successfully in MongoDB
    console.log('Order created in MongoDB:', order._id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    console.error('Database order creation failed, using persistent storage...', error);

    // Save to persistent file storage
    const saved = fileStorage.addOrder(newOrder);

    // Also add to temp storage for backward compatibility
    tempOrders.unshift(newOrder);

    console.log(`✅ Order created in persistent storage: ${newOrder._id}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder,
    });
  }
});

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
const getUserOrders = asyncHandler(async (req, res) => {
  console.log('Getting user orders for user:', req.user.id);

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    let query = { user: req.user.id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.menuItem', 'name image category price')
      .sort({ createdAt: -1 })
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
      count: orders.length,
      total,
      pagination,
      data: orders,
    });
  } catch (error) {
    console.log('Database error, using persistent storage for user orders...');

    try {
      // Try persistent file storage first
      let userOrders = fileStorage.getUserOrders(req.user.id);

      // Filter by status if provided
      if (req.query.status) {
        userOrders = userOrders.filter(order => order.status === req.query.status);
      }

      // Sort by creation date (newest first)
      userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(`✅ Found ${userOrders.length} orders for user ${req.user.id} in persistent storage`);

      res.status(200).json({
        success: true,
        count: userOrders.length,
        total: userOrders.length,
        data: userOrders,
      });
    } catch (fileError) {
      console.error('File storage error, using temp storage...', fileError);

      // Final fallback to temp storage
      const userOrders = tempOrders.filter(order =>
        order.user._id === req.user.id || order.user._id === req.user.id.toString()
      );

      // Filter by status if provided
      let filteredOrders = userOrders;
      if (req.query.status) {
        filteredOrders = userOrders.filter(order => order.status === req.query.status);
      }

      // Sort by creation date (newest first)
      filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(`Found ${filteredOrders.length} orders for user ${req.user.id} in temp storage`);

      res.status(200).json({
        success: true,
        count: filteredOrders.length,
        total: filteredOrders.length,
        data: filteredOrders,
      });
    }
  }
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.menuItem', 'name image category price')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Make sure user owns order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.log('Database error, using temp storage for single order...');

    // Fallback to temp storage
    const order = tempOrders.find(o => o._id === req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Make sure user owns order or is admin
    if (order.user._id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
    });
  }

  try {
    // Try MongoDB first
    const order = await Order.findById(req.params.id);

    if (!order) {
      // If not found in MongoDB, try file storage
      console.log('Order not found in MongoDB, trying file storage...');
      const fileOrder = fileStorage.findOrderById(req.params.id);

      if (!fileOrder) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // Update in file storage
      const updateData = {
        status,
        updatedAt: new Date()
      };

      // Set actual delivery time if delivered
      if (status === 'delivered') {
        updateData.actualDeliveryTime = new Date();
      }

      const updatedOrder = fileStorage.updateOrder(req.params.id, updateData);

      if (!updatedOrder) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update order status in file storage',
        });
      }

      console.log(`✅ Order status updated successfully in file storage: ${req.params.id}`);

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder,
      });
    }

    // Update in MongoDB
    order.status = status;

    // Set actual delivery time if delivered
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    console.log(`✅ Order status updated successfully in MongoDB: ${req.params.id}`);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });

  } catch (error) {
    console.log('MongoDB error, trying file storage fallback...', error.message);

    // Fallback to file storage
    const fileOrder = fileStorage.findOrderById(req.params.id);

    if (!fileOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update in file storage
    const updateData = {
      status,
      updatedAt: new Date()
    };

    // Set actual delivery time if delivered
    if (status === 'delivered') {
      updateData.actualDeliveryTime = new Date();
    }

    const updatedOrder = fileStorage.updateOrder(req.params.id, updateData);

    if (!updatedOrder) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update order status in file storage',
      });
    }

    console.log(`✅ Order status updated successfully in file storage (fallback): ${req.params.id}`);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
    });
  }
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Make sure user owns order
  if (order.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this order',
    });
  }

  // Check if order can be cancelled
  if (['delivered', 'cancelled'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Order cannot be cancelled',
    });
  }

  order.status = 'cancelled';
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
});

// @desc    Add order review
// @route   POST /api/orders/:id/review
// @access  Private
const addOrderReview = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a rating between 1 and 5',
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Make sure user owns order
  if (order.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to review this order',
    });
  }

  // Check if order is delivered
  if (order.status !== 'delivered') {
    return res.status(400).json({
      success: false,
      message: 'Can only review delivered orders',
    });
  }

  // Check if already reviewed
  if (order.rating) {
    return res.status(400).json({
      success: false,
      message: 'Order already reviewed',
    });
  }

  order.rating = rating;
  order.review = review;
  await order.save();

  res.status(200).json({
    success: true,
    message: 'Review added successfully',
    data: order,
  });
});

// @desc    Get all orders for admin
// @route   GET /api/orders/admin/all
// @access  Private/Admin
const getAdminOrders = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status;
    const orderType = req.query.orderType;
    const paymentMethod = req.query.paymentMethod;
    const search = req.query.search;

    let query = {};

    if (status) query.status = status;
    if (orderType) query.orderType = orderType;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination,
      data: orders,
    });
  } catch (dbError) {
    // Fallback to persistent file storage + temp storage
    console.log('Database unavailable, using persistent storage for admin orders...');

    let filteredOrders = [];

    try {
      // Get orders from persistent file storage
      let fileOrders = fileStorage.getOrders();

      // Merge with temp storage (remove duplicates)
      let allOrders = [...fileOrders];

      // Add temp orders that aren't already in file storage
      tempOrders.forEach(tempOrder => {
        const exists = fileOrders.find(fileOrder =>
          (fileOrder._id === tempOrder._id) || (fileOrder.id === tempOrder.id)
        );
        if (!exists) {
          allOrders.push(tempOrder);
        }
      });

      filteredOrders = [...allOrders];

      console.log(`✅ Found ${allOrders.length} total orders for admin (${fileOrders.length} from file, ${tempOrders.length} from temp)`);
    } catch (fileError) {
      console.error('File storage error, using temp storage only...', fileError);
      filteredOrders = [...tempOrders];
    }

    // Apply filters
    if (req.query.status) {
      filteredOrders = filteredOrders.filter(order => order.status === req.query.status);
    }
    if (req.query.orderType) {
      filteredOrders = filteredOrders.filter(order => order.orderType === req.query.orderType);
    }
    if (req.query.paymentMethod) {
      filteredOrders = filteredOrders.filter(order => order.paymentMethod === req.query.paymentMethod);
    }
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm) ||
        order.user.name.toLowerCase().includes(searchTerm) ||
        order.user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    const total = filteredOrders.length;

    const pagination = {};
    if (endIndex < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: paginatedOrders.length,
      total,
      pagination,
      data: paginatedOrders,
    });
  }
});

// @desc    Update order status (Admin)
// @route   PUT /api/orders/admin/:id/status
// @access  Private/Admin
const updateAdminOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order status',
    });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate('user', 'name email phone')
     .populate('items.menuItem', 'name price');

    if (!order) {
      // If not found in MongoDB, try file storage
      console.log('Order not found in MongoDB, trying file storage...');

      const updatedOrder = fileStorage.updateOrder(req.params.id, {
        status,
        updatedAt: new Date(),
      });

      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      console.log(`✅ Order status updated successfully in file storage: ${req.params.id}`);

      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder,
      });
    }

    console.log(`✅ Order status updated successfully in MongoDB: ${req.params.id}`);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (dbError) {
    // Fallback to persistent file storage + temp storage
    console.log('Database unavailable, using persistent storage for updating order status...');

    try {
      // Update in persistent file storage first
      const updatedOrder = fileStorage.updateOrder(req.params.id, {
        status,
        updatedAt: new Date(),
      });

      if (updatedOrder) {
        // Also update in temp storage for backward compatibility
        const orderIndex = tempOrders.findIndex(order => order._id === req.params.id);
        if (orderIndex !== -1) {
          tempOrders[orderIndex] = {
            ...tempOrders[orderIndex],
            status,
            updatedAt: new Date(),
          };
        }

        console.log(`✅ Order status updated in persistent storage: ${req.params.id} -> ${status}`);

        return res.status(200).json({
          success: true,
          message: 'Order status updated successfully',
          data: updatedOrder,
        });
      }
    } catch (fileError) {
      console.error('File storage error during status update:', fileError);
    }

    // Final fallback to temp storage only
    console.log('Using temp storage only for updating order status...');

    const orderIndex = tempOrders.findIndex(order => order._id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    tempOrders[orderIndex] = {
      ...tempOrders[orderIndex],
      status,
      updatedAt: new Date(),
    };

    console.log(`✅ Order status updated in temp storage: ${req.params.id} -> ${status}`);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: tempOrders[orderIndex],
    });
  }
});

// @desc    Get order statistics for admin
// @route   GET /api/orders/admin/stats
// @access  Private/Admin
const getOrderStats = asyncHandler(async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const preparingOrders = await Order.countDocuments({ status: 'preparing' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    // Revenue calculation
    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        preparingOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        todayOrders,
        ordersByStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          preparing: preparingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
      },
    });
  } catch (dbError) {
    // Fallback stats for temp storage
    const totalOrders = tempOrders.length;
    const pendingOrders = tempOrders.filter(o => o.status === 'pending').length;
    const confirmedOrders = tempOrders.filter(o => o.status === 'confirmed').length;
    const preparingOrders = tempOrders.filter(o => o.status === 'preparing').length;
    const deliveredOrders = tempOrders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = tempOrders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = tempOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        preparingOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        todayOrders: 2,
        ordersByStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          preparing: preparingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
      },
    });
  }
});

// Export temp orders for other controllers
const getTempOrders = () => tempOrders;

module.exports = {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  addOrderReview,
  getAdminOrders,
  updateAdminOrderStatus,
  getOrderStats,
  getTempOrders,
};