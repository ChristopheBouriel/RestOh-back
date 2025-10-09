const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/MenuItem');

// Your sample data with minimal additions
const menuData = [
  {
    name: 'Pizza Margherita',
    description: 'Base tomate, mozzarella, basilic frais, huile d\'olive extra vierge',
    price: 15.90,
    image: 'pizza-margherita.jpg',
    category: 'main',
    cuisine: 'italian',
    isVegetarian: true,
    isAvailable: true,
    ingredients: ['Pâte à pizza', 'Sauce tomate', 'Mozzarella', 'Basilic'],
    allergens: ['wheat', 'dairy'],
    isPopular: true,
    orderCount: 45,
    rating: {
      average: 4.8,
      count: 23
    },
    reviews: []
  },
  {
    name: 'Salade César',
    description: 'Salade romaine, croûtons croustillants, copeaux de parmesan, sauce césar maison',
    price: 12.50,
    image: 'salade-cesar.jpg',
    category: 'appetizer',
    cuisine: 'american',
    isVegetarian: true,
    isAvailable: true,
    ingredients: ['Salade romaine', 'Croûtons', 'Parmesan', 'Sauce césar'],
    allergens: ['wheat', 'dairy', 'eggs'],
    isPopular: true,
    orderCount: 32,
    rating: {
      average: 4.5,
      count: 18
    },
    reviews: []
  },
  {
    name: 'Burger Gourmand',
    description: 'Pain artisanal, steak de bœuf, fromage, légumes frais, frites maison',
    price: 18.00,
    image: 'burger-gourmand.jpg',
    category: 'main',
    cuisine: 'american',
    isVegetarian: false,
    isAvailable: true,
    ingredients: ['Pain burger', 'Steak de bœuf', 'Fromage cheddar', 'Salade', 'Tomates'],
    allergens: ['wheat', 'dairy'],
    isPopular: true,
    orderCount: 67,
    rating: {
      average: 4.7,
      count: 34
    },
    reviews: []
  },
  {
    name: 'Tiramisu',
    description: 'Dessert italien traditionnel au café et mascarpone, saupoudré de cacao',
    price: 7.50,
    image: 'tiramisu-maison.jpg',
    category: 'dessert',
    cuisine: 'italian',
    isVegetarian: true,
    isAvailable: false,
    ingredients: ['Mascarpone', 'Café', 'Biscuits à la cuillère', 'Cacao'],
    allergens: ['dairy', 'eggs', 'wheat'],
    isPopular: true,
    orderCount: 23,
    rating: {
      average: 4.9,
      count: 15
    },
    reviews: []
  },
  {
    name: 'Coca-Cola',
    description: 'Boisson gazeuse rafraîchissante 33cl',
    price: 4.00,
    image: 'coca-cola.jpg',
    category: 'beverage',
    cuisine: 'american',
    isVegetarian: true,
    isAvailable: true,
    ingredients: ['Eau gazéifiée', 'Sucre', 'Arômes naturels'],
    allergens: [],
    isPopular: false,
    orderCount: 12,
    rating: {
      average: 4.0,
      count: 8
    },
    reviews: []
  },
  {
    name: 'Frites Maison',
    description: 'Pommes de terre fraîches coupées et frites, servies avec une sauce au choix',
    price: 5.50,
    image: 'frites-maison.jpg',
    category: 'appetizer',
    cuisine: 'continental',
    isVegetarian: true,
    isAvailable: true,
    ingredients: ['Pommes de terre', 'Huile végétale', 'Sel'],
    allergens: [],
    isPopular: false,
    orderCount: 18,
    rating: {
      average: 4.2,
      count: 12
    },
    reviews: []
  }
];

// Function to seed the database
async function seedMenu() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('🗑️  Cleared existing menu items');

    // Insert new menu items
    const createdItems = await MenuItem.insertMany(menuData);
    console.log(`✅ Created ${createdItems.length} menu items`);

    // Display created items
    console.log('\n📋 CREATED MENU ITEMS:');
    createdItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.category}) - €${item.price} - Rating: ${item.rating.average}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');

  } catch (error) {
    console.error('❌ Error seeding menu:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedMenu();
}

module.exports = { seedMenu, menuData };