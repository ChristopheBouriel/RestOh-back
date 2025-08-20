# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **restOh-back**, a Node.js/Express backend API for the RestOh Restaurant Web Application. It provides comprehensive restaurant management features including menu management, order processing, reservations, user authentication, and payment integration.

## Development Commands

### Core Development
- **Start server**: `npm start` (production) or `npm run dev` (development with nodemon)
- **Debug mode**: `npm run dev:debug` (with Node.js inspector)
- **Environment**: Requires Node.js >=14.0.0

### Database Setup
The application supports dual-mode operation:
- **With MongoDB**: Set `MONGODB_URI` in .env file for persistent storage
- **Without MongoDB**: Automatically falls back to JSON file-based storage in `/data` directory

## Architecture Overview

### MVC Structure
```
├── config/           # Database configuration
├── controllers/      # Business logic handlers
├── data/            # JSON file storage (when MongoDB unavailable)
├── middleware/      # Authentication & error handling
├── models/          # MongoDB schemas (Mongoose)
├── routes/          # API endpoint definitions
├── utils/           # Utility functions and helpers
└── server.js        # Main application entry point
```

### Key Architectural Patterns

#### Dual Storage System
The application implements a robust fallback mechanism:
- **Primary**: MongoDB with Mongoose ODM
- **Fallback**: JSON file storage via `utils/fileStorage.js`
- Controllers automatically handle both storage types transparently

#### Authentication & Authorization
- JWT-based authentication with `middleware/auth.js`
- Role-based access control (admin/user roles)
- Supports temporary in-memory storage for development without database

#### API Structure
All endpoints follow `/api/{resource}` pattern:
- `/api/auth` - Authentication (login, register, profile)
- `/api/menu` - Menu management
- `/api/orders` - Order processing
- `/api/reservations` - Table reservations
- `/api/payments` - Payment processing (Stripe)
- `/api/users` - User management
- `/api/admin` - Administrative functions
- `/api/contact` - Contact form handling

### Payment Integration
- **Stripe**: Card payments with webhook support
- **COD**: Cash on delivery option
- Test mode configured by default (see PAYMENT_SETUP_GUIDE.md)

### Security Features
- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes per IP)
- CORS configuration for multiple frontend origins
- Password hashing with bcryptjs
- Input validation with Joi

### Error Handling
- Global error handler in `middleware/errorHandler.js`
- Async wrapper utility in `utils/asyncHandler.js`
- Custom error response utility in `utils/errorResponse.js`

## Data Models

### Core Entities
- **User**: Authentication, profiles, preferences, addresses
- **MenuItem**: Menu items with categories, pricing, availability
- **Order**: Order processing with items, payment status, delivery
- **Reservation**: Table booking system with time slots

### User Roles
- **user**: Regular customers (order, reserve, profile management)
- **admin**: Full access to all resources and admin panel

## Development Notes

### Environment Configuration
- Copy `.env.example` to `.env` and configure
- Essential variables: `JWT_SECRET`, `JWT_EXPIRE`, `MONGODB_URI`
- Payment gateways: `STRIPE_SECRET_KEY`

### Testing Without Database
- Application automatically handles MongoDB connection failures
- Falls back to JSON file storage in `/data` directory
- Temporary data structures provide consistent API responses

### File Upload Handling
- Cloudinary integration for image storage
- Multer middleware for file uploads
- Avatar uploads for user profiles

### API Response Format
Consistent response structure across all endpoints:
```json
{
  "success": boolean,
  "message": string,
  "data": object/array
}
```

### Development Workflow
1. MongoDB is optional - app works with or without it
2. Payment system starts in test mode (no real charges)
3. CORS configured for multiple localhost ports (3000, 3001, 3002)
4. Rate limiting applies only to `/api/` routes