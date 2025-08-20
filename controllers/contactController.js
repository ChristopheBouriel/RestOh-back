const asyncHandler = require('../utils/asyncHandler');
const { validateContact } = require('../utils/validation');

// Store contact messages in memory (in production, you'd use a database)
let contactMessages = [];
let messageId = 1;

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
const submitContactForm = asyncHandler(async (req, res) => {
  // Validate input
  const { error } = validateContact(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { name, email, phone, subject, message } = req.body;

  // Create contact message object
  const contactMessage = {
    id: messageId++,
    name,
    email,
    phone,
    subject,
    message,
    createdAt: new Date(),
    status: 'new',
  };

  // Store the message
  contactMessages.unshift(contactMessage);

  // In a real application, you would:
  // 1. Save to database
  // 2. Send email notification to admin (sharmadipanshu190411@gmail.com)
  // 3. Send confirmation email to user
  
  console.log('📧 New contact form submission:');
  console.log(`From: ${name} (${email})`);
  console.log(`Phone: ${phone}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log(`📬 This message should be sent to: sharmadipanshu190411@gmail.com`);

  res.status(200).json({
    success: true,
    message: 'Thank you for your message! We will get back to you soon.',
    data: {
      id: contactMessage.id,
      submittedAt: contactMessage.createdAt,
    },
  });
});

// @desc    Get all contact messages (Admin only)
// @route   GET /api/contact/admin/messages
// @access  Private/Admin
const getContactMessages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status;

  let filteredMessages = contactMessages;

  // Filter by status if provided
  if (status) {
    filteredMessages = contactMessages.filter(msg => msg.status === status);
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  // Pagination info
  const pagination = {};
  if (endIndex < filteredMessages.length) {
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
    count: paginatedMessages.length,
    total: filteredMessages.length,
    pagination,
    data: paginatedMessages,
  });
});

// @desc    Update contact message status (Admin only)
// @route   PUT /api/contact/admin/messages/:id
// @access  Private/Admin
const updateContactMessageStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const messageIndex = contactMessages.findIndex(msg => msg.id === parseInt(req.params.id));

  if (messageIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Contact message not found',
    });
  }

  const validStatuses = ['new', 'read', 'replied', 'resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Valid statuses are: new, read, replied, resolved',
    });
  }

  contactMessages[messageIndex].status = status;
  contactMessages[messageIndex].updatedAt = new Date();

  res.status(200).json({
    success: true,
    message: 'Contact message status updated successfully',
    data: contactMessages[messageIndex],
  });
});

// @desc    Delete contact message (Admin only)
// @route   DELETE /api/contact/admin/messages/:id
// @access  Private/Admin
const deleteContactMessage = asyncHandler(async (req, res) => {
  const messageIndex = contactMessages.findIndex(msg => msg.id === parseInt(req.params.id));

  if (messageIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Contact message not found',
    });
  }

  contactMessages.splice(messageIndex, 1);

  res.status(200).json({
    success: true,
    message: 'Contact message deleted successfully',
  });
});

// Export temp messages for other controllers
const getTempContactMessages = () => contactMessages;

module.exports = {
  submitContactForm,
  getContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
  getTempContactMessages,
};