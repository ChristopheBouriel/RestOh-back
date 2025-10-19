const request = require('supertest');
const express = require('express');
const menuRoutes = require('../../routes/menu');
const { protect, authorize } = require('../../middleware/auth');
const {
  createTestUser,
  createTestAdmin,
  createTestMenuItem,
  generateAuthToken,
} = require('../helpers/testHelpers');

jest.mock('../../middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req, res, next) => next()),
}));

jest.mock('../../middleware/cloudinaryUpload', () => ({
  uploadMenuImage: jest.fn((req, res, next) => next()),
  deleteImage: jest.fn().mockResolvedValue({ result: 'ok' }),
}));

const app = express();
app.use(express.json());
app.use('/api/menu', menuRoutes);

describe('Menu Routes Integration Tests', () => {
  describe('GET /api/menu', () => {
    it('should get all menu items', async () => {
      await createTestMenuItem({ name: 'Test Item 1', price: 10 });
      await createTestMenuItem({ name: 'Test Item 2', price: 20 });

      const res = await request(app)
        .get('/api/menu')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    it('should filter items by category', async () => {
      await createTestMenuItem({ name: 'Main Dish', category: 'main' });
      await createTestMenuItem({ name: 'Appetizer', category: 'appetizer' });

      const res = await request(app)
        .get('/api/menu?category=main')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('main');
    });

    it('should filter vegetarian items', async () => {
      await createTestMenuItem({ name: 'Meat Dish', isVegetarian: false });
      await createTestMenuItem({ name: 'Veggie Dish', isVegetarian: true });

      const res = await request(app)
        .get('/api/menu?vegetarian=true')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].isVegetarian).toBe(true);
    });

    it('should search items by name', async () => {
      await createTestMenuItem({ name: 'Chicken Curry' });
      await createTestMenuItem({ name: 'Beef Steak' });

      const res = await request(app)
        .get('/api/menu?search=chicken')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toMatch(/chicken/i);
    });

    it('should handle pagination', async () => {
      for (let i = 1; i <= 5; i++) {
        await createTestMenuItem({ name: `Item ${i}` });
      }

      const res = await request(app)
        .get('/api/menu?page=2&limit=2')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toHaveProperty('prev');
      expect(res.body.pagination).toHaveProperty('next');
    });
  });

  describe('GET /api/menu/popular', () => {
    it('should get popular menu items', async () => {
      await createTestMenuItem({ name: 'Popular Item', orderCount: 50 });
      await createTestMenuItem({ name: 'Less Popular', orderCount: 10 });

      const res = await request(app)
        .get('/api/menu/popular')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].orderCount).toBeGreaterThanOrEqual(res.body.data[1].orderCount);
    });

    it('should limit popular items', async () => {
      for (let i = 1; i <= 10; i++) {
        await createTestMenuItem({ name: `Item ${i}`, orderCount: i });
      }

      const res = await request(app)
        .get('/api/menu/popular?limit=3')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
    });
  });

  describe('GET /api/menu/:id', () => {
    it('should get a single menu item', async () => {
      const menuItem = await createTestMenuItem({ name: 'Test Item' });

      const res = await request(app)
        .get(`/api/menu/${menuItem._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Item');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .get('/api/menu/507f1f77bcf86cd799439011')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Menu item not found');
    });
  });

  describe('POST /api/menu', () => {
    beforeEach(() => {
      protect.mockImplementation((req, res, next) => {
        req.user = { _id: 'admin-id', role: 'admin' };
        next();
      });
      authorize.mockImplementation(() => (req, res, next) => next());
    });

    it('should create a new menu item', async () => {
      const newItem = {
        name: 'New Dish',
        description: 'A delicious new dish',
        price: 25.99,
        category: 'main',
        isAvailable: true,
      };

      const res = await request(app)
        .post('/api/menu')
        .send(newItem)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Menu item created successfully');
      expect(res.body.data.name).toBe('New Dish');
    });

    it('should return 400 for invalid data', async () => {
      const invalidItem = {
        name: '',
        price: -5,
      };

      const res = await request(app)
        .post('/api/menu')
        .send(invalidItem)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation error');
    });

    it('should handle image upload', async () => {
      const itemWithImage = {
        name: 'Dish with Image',
        description: 'A dish with image',
        price: 15.99,
        category: 'main',
        image: 'https://cloudinary.com/image.jpg',
      };

      const res = await request(app)
        .post('/api/menu')
        .send(itemWithImage)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.image).toBe('https://cloudinary.com/image.jpg');
    });
  });

  describe('PUT /api/menu/:id', () => {
    beforeEach(() => {
      protect.mockImplementation((req, res, next) => {
        req.user = { _id: 'admin-id', role: 'admin' };
        next();
      });
      authorize.mockImplementation(() => (req, res, next) => next());
    });

    it('should update a menu item', async () => {
      const menuItem = await createTestMenuItem({ name: 'Original Name' });

      const updates = {
        name: 'Updated Name',
        price: 30,
      };

      const res = await request(app)
        .put(`/api/menu/${menuItem._id}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Menu item updated successfully');
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .put('/api/menu/507f1f77bcf86cd799439011')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Menu item not found');
    });

    it('should validate update data', async () => {
      const menuItem = await createTestMenuItem();

      const res = await request(app)
        .put(`/api/menu/${menuItem._id}`)
        .send({ price: -10 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation error');
    });
  });

  describe('DELETE /api/menu/:id', () => {
    beforeEach(() => {
      protect.mockImplementation((req, res, next) => {
        req.user = { _id: 'admin-id', role: 'admin' };
        next();
      });
      authorize.mockImplementation(() => (req, res, next) => next());
    });

    it('should delete a menu item', async () => {
      const menuItem = await createTestMenuItem();

      const res = await request(app)
        .delete(`/api/menu/${menuItem._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Menu item deleted successfully');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .delete('/api/menu/507f1f77bcf86cd799439011')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Menu item not found');
    });
  });

  describe('POST /api/menu/:id/review', () => {
    beforeEach(() => {
      protect.mockImplementation((req, res, next) => {
        req.user = { _id: 'user-id', name: 'Test User' };
        next();
      });
    });

    it('should add a review to menu item', async () => {
      const menuItem = await createTestMenuItem();

      const review = {
        rating: 5,
        comment: 'Excellent dish!',
      };

      const res = await request(app)
        .post(`/api/menu/${menuItem._id}/review`)
        .send(review)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Review added successfully');
      expect(res.body.data.rating.average).toBe(5);
      expect(res.body.data.rating.count).toBe(1);
    });

    it('should return 400 for invalid rating', async () => {
      const menuItem = await createTestMenuItem();

      const review = {
        rating: 6,
        comment: 'Invalid rating',
      };

      const res = await request(app)
        .post(`/api/menu/${menuItem._id}/review`)
        .send(review)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Rating must be between 1 and 5');
    });

    it('should return 404 for non-existent item', async () => {
      const review = {
        rating: 5,
        comment: 'Great!',
      };

      const res = await request(app)
        .post('/api/menu/507f1f77bcf86cd799439011/review')
        .send(review)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Menu item not found');
    });
  });
});