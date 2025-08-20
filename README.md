# RestOh Backend API

Backend API for RestOh Restaurant Web Application - A comprehensive restaurant management system built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication** - JWT-based auth with role-based access control
- **Menu Management** - CRUD operations for restaurant menu items
- **Order Processing** - Complete order lifecycle management
- **Table Reservations** - Booking system with time slot management
- **Payment Integration** - Stripe payment processing + Cash on Delivery
- **Admin Dashboard** - Administrative functions for restaurant management
- **File Uploads** - Cloudinary integration for image storage
- **Dual Storage** - MongoDB with automatic JSON fallback for development

## 🛠️ Tech Stack

- **Runtime**: Node.js (>=14.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **Payment**: Stripe
- **Storage**: Cloudinary (images)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd restoh-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start

   # Debug mode
   npm run dev:debug
   ```

## ⚙️ Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/restoh

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000
```

## 🗂️ Project Structure

```
├── config/          # Database configuration
├── controllers/     # Business logic handlers
├── data/           # JSON file storage (development fallback)
├── middleware/     # Authentication & error handling
├── models/         # MongoDB schemas
├── routes/         # API endpoint definitions
├── utils/          # Utility functions
└── server.js       # Main application entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/updateprofile` - Update user profile

### Menu
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Create menu item (Admin)
- `PUT /api/menu/:id` - Update menu item (Admin)
- `DELETE /api/menu/:id` - Delete menu item (Admin)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get specific order
- `PUT /api/orders/:id` - Update order status

### Reservations
- `GET /api/reservations` - Get user reservations
- `POST /api/reservations` - Create reservation
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Cancel reservation

### Payments
- `GET /api/payments/methods` - Get available payment methods
- `POST /api/payments/stripe/create-intent` - Create Stripe payment intent
- `POST /api/payments/stripe/confirm` - Confirm Stripe payment

### Admin
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/users` - Get all users

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Default Admin Account:**
- Email: `admin@restoh.com`
- Password: `admin123`

## 💳 Payment Integration

The system supports:
- **Stripe** - Credit/debit card payments
- **Cash on Delivery (COD)** - Pay upon delivery

For payment setup instructions, see [PAYMENT_SETUP_GUIDE.md](./PAYMENT_SETUP_GUIDE.md).

## 🗄️ Database

### With MongoDB
Set `MONGODB_URI` in your `.env` file to connect to MongoDB.

### Without MongoDB (Development)
The system automatically falls back to JSON file storage in the `data/` directory if MongoDB is unavailable.

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Password Hashing** - bcryptjs encryption
- **Input Validation** - Joi schema validation
- **JWT Authentication** - Secure token-based auth

## 📡 API Response Format

All endpoints return consistent JSON responses:

```json
{
  "success": boolean,
  "message": "Response message",
  "data": {} // Response data
}
```

## 🚨 Error Handling

The API includes comprehensive error handling:
- **Global Error Handler** - Catches all unhandled errors
- **Async Wrapper** - Handles async/await errors
- **Custom Error Classes** - Structured error responses
- **Validation Errors** - Detailed field-level validation

## 📋 Development

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn
- MongoDB (optional - uses JSON fallback)

### Development Workflow
1. Make changes to the code
2. The server auto-restarts with nodemon
3. Test endpoints with your preferred API client
4. Check logs for any errors

### Testing
Use tools like Postman, Insomnia, or curl to test API endpoints.

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

RestOh Team

---

For detailed development guidance, see [CLAUDE.md](./CLAUDE.md).