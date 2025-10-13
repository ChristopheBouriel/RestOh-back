const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Create a simple test image (1x1 PNG)
const testImageBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
  0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x5C, 0xC2, 0x5D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

async function testImageUpload() {
  try {
    console.log('🧪 Testing image upload functionality...');

    // Create form data
    const form = new FormData();
    form.append('name', 'Pizza Test');
    form.append('description', 'Test pizza with uploaded image');
    form.append('price', '15.99');
    form.append('category', 'main');
    form.append('cuisine', 'continental');
    form.append('isVegetarian', 'true');
    form.append('ingredients', JSON.stringify(['tomato', 'cheese']));
    form.append('allergens', JSON.stringify(['dairy']));
    form.append('image', testImageBuffer, {
      filename: 'test-pizza.png',
      contentType: 'image/png'
    });

    // Make request to backend (assuming admin token is needed)
    const response = await axios.post('http://localhost:3001/api/menu', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer test-admin-token' // You'll need to replace this
      },
      timeout: 10000
    });

    console.log('✅ Upload successful!');
    console.log('📸 Image URL:', response.data.data.image);
    console.log('📋 Menu item created:', response.data.data.name);

  } catch (error) {
    console.log('❌ Upload failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data.message);
    } else {
      console.log('Network Error:', error.message);
    }
  }
}

// Run test
testImageUpload();