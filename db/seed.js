require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { User, Category, Product } = require('../models');

/**
 * Database Seeder
 * Seeds initial data for testing and development
 */

// Sample Categories matching your frontend
const categoriesData = [
  { name: 'Footwear', icon: '👟', description: 'Shoes, sneakers, and footwear for all occasions' },
  { name: 'Electronics', icon: '⌚', description: 'Latest gadgets and electronic devices' },
  { name: 'Fashion', icon: '👚', description: 'Clothing, accessories, and fashion items' },
  { name: 'Home & Living', icon: '🏠', description: 'Home decor, furniture, and living essentials' },
  { name: 'Beauty', icon: '💄', description: 'Beauty products, skincare, and cosmetics' },
  { name: 'Audio', icon: '🎧', description: 'Headphones, speakers, and audio equipment' },
  { name: 'Computers', icon: '💻', description: 'Laptops, desktops, and computer accessories' },
  { name: 'Cameras', icon: '📷', description: 'Digital cameras and photography equipment' },
  { name: 'Gaming', icon: '🎮', description: 'Gaming consoles, accessories, and games' },
];

// Sample Products matching your frontend
const productsData = [
  {
    name: 'Air Luxe Runner Pro',
    emoji: '👟',
    description: 'Premium running shoes with advanced cushioning technology. Perfect for athletes and casual runners alike. Features breathable mesh upper and responsive foam midsole.',
    shortDescription: 'Premium running shoes with advanced cushioning',
    price: 249,
    compareAtPrice: 349,
    quantity: 50,
    badge: 'Best Seller',
    rating: { average: 4.8, count: 2341 },
    categoryName: 'Footwear',
    isFeatured: true,
  },
  {
    name: 'Apex Smart Watch X1',
    emoji: '⌚',
    description: 'Next-generation smartwatch with health monitoring, GPS tracking, and 7-day battery life. Water-resistant up to 50 meters.',
    shortDescription: 'Advanced smartwatch with health monitoring',
    price: 399,
    compareAtPrice: 499,
    quantity: 30,
    badge: 'New',
    rating: { average: 4.9, count: 987 },
    categoryName: 'Electronics',
    isFeatured: true,
  },
  {
    name: 'Studio Pro ANC Headphones',
    emoji: '🎧',
    description: 'Professional noise-canceling headphones with studio-quality sound. 40-hour battery life and premium comfort for extended listening.',
    shortDescription: 'Premium noise-canceling headphones',
    price: 189,
    compareAtPrice: 249,
    quantity: 75,
    badge: 'Sale',
    rating: { average: 4.7, count: 1654 },
    categoryName: 'Audio',
    isFeatured: true,
  },
  {
    name: 'UltraBook 14 Pro',
    emoji: '💻',
    description: 'Ultra-thin laptop with M2 chip, 16GB RAM, and 512GB SSD. Stunning Retina display and all-day battery life.',
    shortDescription: 'Ultra-thin professional laptop',
    price: 1299,
    compareAtPrice: 1599,
    quantity: 20,
    badge: null,
    rating: { average: 4.6, count: 543 },
    categoryName: 'Computers',
    isFeatured: true,
  },
  {
    name: 'Mirrorless Pro Z9',
    emoji: '📷',
    description: 'Professional mirrorless camera with 45MP sensor, 8K video recording, and advanced autofocus system.',
    shortDescription: 'Professional mirrorless camera',
    price: 879,
    compareAtPrice: 999,
    quantity: 15,
    badge: 'Hot',
    rating: { average: 4.8, count: 321 },
    categoryName: 'Cameras',
    isFeatured: true,
  },
  {
    name: 'GamePad Elite V2',
    emoji: '🎮',
    description: 'Premium wireless gaming controller with haptic feedback, adaptive triggers, and 20-hour battery life.',
    shortDescription: 'Premium wireless gaming controller',
    price: 79,
    compareAtPrice: 99,
    quantity: 100,
    badge: 'Sale',
    rating: { average: 4.5, count: 4521 },
    categoryName: 'Gaming',
    isFeatured: true,
  },
  {
    name: 'Signature Tote Bag',
    emoji: '👜',
    description: 'Elegant leather tote bag with multiple compartments. Perfect for work or weekend getaways.',
    shortDescription: 'Elegant leather tote bag',
    price: 149,
    compareAtPrice: 199,
    quantity: 40,
    badge: null,
    rating: { average: 4.9, count: 876 },
    categoryName: 'Fashion',
    isFeatured: true,
  },
  {
    name: 'Aura Fragrance Set',
    emoji: '🌟',
    description: 'Luxury fragrance collection featuring 4 signature scents. Perfect for gifting or personal indulgence.',
    shortDescription: 'Luxury fragrance collection',
    price: 89,
    compareAtPrice: 120,
    quantity: 60,
    badge: 'Limited',
    rating: { average: 4.7, count: 2109 },
    categoryName: 'Beauty',
    isFeatured: true,
  },
];

// Sample Users
const usersData = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@luxemart.com',
    password: 'Admin@123456',
    phone: '+1 555 0100',
    role: 'admin',
    isEmailVerified: true,
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'Password@123',
    phone: '+1 555 0101',
    role: 'user',
    isEmailVerified: true,
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'Password@123',
    phone: '+1 555 0102',
    role: 'user',
    isEmailVerified: true,
  },
];

const seedDatabase = async () => {
  try {
    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('Existing data cleared');

    // Create categories
    console.log('Creating categories...');
    const categoriesMap = {};
    for (const catData of categoriesData) {
      const category = await Category.create(catData);
      categoriesMap[catData.name] = category._id;
      console.log(`  ✓ Created category: ${catData.name}`);
    }

    // Create products
    console.log('Creating products...');
    for (const prodData of productsData) {
      const productData = {
        ...prodData,
        category: categoriesMap[prodData.categoryName],
      };
      delete productData.categoryName;
      
      await Product.create(productData);
      console.log(`  ✓ Created product: ${prodData.name}`);
    }

    // Create users
    console.log('Creating users...');
    for (const userData of usersData) {
      await User.create(userData);
      console.log(`  ✓ Created user: ${userData.email} (${userData.role})`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SEEDING COMPLETE                        ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                                                            ║');
    console.log('║  SAMPLE LOGIN CREDENTIALS:                                 ║');
    console.log('║                                                            ║');
    console.log('║  Admin Account:                                            ║');
    console.log('║    Email: admin@luxemart.com                               ║');
    console.log('║    Password: Admin@123456                                  ║');
    console.log('║                                                            ║');
    console.log('║  User Account:                                             ║');
    console.log('║    Email: john.doe@example.com                             ║');
    console.log('║    Password: Password@123                                  ║');
    console.log('║                                                            ║');
    console.log('║  Categories Created: 9                                     ║');
    console.log('║  Products Created: 8                                       ║');
    console.log('║  Users Created: 3                                          ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
