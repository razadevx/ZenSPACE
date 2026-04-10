const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Company } = require('./models');

// Sample data
const sampleCompany = {
  name: 'AKS Ceramics',
  code: 'AKS-2024',
  phone: '+92-300-1234567',
  city: 'Lahore',
  country: 'Pakistan',
  status: 'active',
  trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
};

const sampleUser = {
  name: 'Admin User',
  email: 'admin@aks.com',
  password: 'admin123',
  role: 'ADMIN',
  status: 'active'
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aks_digirec');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    console.log('Cleared existing data');

    // Create company
    const company = await Company.create(sampleCompany);
    console.log('Created company:', company.name);

    // Create user (password will be hashed automatically by the model)
    const user = await User.create({
      ...sampleUser,
      companyId: company._id
    });
    console.log('Created user:', user.name);

    // Update company with createdBy
    company.createdBy = user._id;
    await company.save();

    console.log('\n=== Database Seeded Successfully ===');
    console.log('Login Credentials:');
    console.log('Email:', sampleUser.email);
    console.log('Password:', sampleUser.password);
    console.log('Company:', sampleCompany.name);
    console.log('\nYou can now login to the application!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
