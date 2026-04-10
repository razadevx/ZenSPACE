/**
 * Production Data Setup Script
 * Run with: node scripts/setupProductionData.js
 * 
 * This script:
 * 1. Renames Test Company to "AKS DigiRec Demo"
 * 2. Creates 3 users: Master Admin, Admin, Operator
 */

const mongoose = require('mongoose');
const models = require('../src/models');
require('dotenv').config();

const { Company, User, Role } = models;

async function setupProductionData() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digirec');
    console.log('Connected to MongoDB\n');

    // Find the company
    let company = await Company.findOne();
    
    if (!company) {
      console.log('Creating AKS DigiRec Demo company...');
      company = await Company.create({
        name: 'AKS DigiRec Demo',
        code: 'AKS001',
        email: 'admin@aksdigirec.com',
        address: 'Lahore, Pakistan',
        phone: '042-1234567',
        currency: 'PKR',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Asia/Karachi',
      });
    } else {
      // Rename to AKS DigiRec Demo
      console.log(`Renaming "${company.name}" to "AKS DigiRec Demo"...`);
      company.name = 'AKS DigiRec Demo';
      company.code = 'AKS001';
      await company.save();
    }
    
    console.log(`Company: ${company.name} (${company._id})\n`);

    // Get or create roles
    const roles = await Role.find({});
    console.log('Available roles:');
    roles.forEach(r => console.log(`  - ${r.name} (${r._id})`));
    console.log();

    // Find required roles
    let superAdminRole = roles.find(r => r.name === 'super_admin');
    let adminRole = roles.find(r => r.name === 'admin');
    let operatorRole = roles.find(r => r.name === 'operator');

    // Create roles if they don't exist
    if (!superAdminRole) {
      console.log('Creating super_admin role...');
      const defaultRoles = Role.getDefaultRoles ? Role.getDefaultRoles() : [];
      const roleData = defaultRoles.find(r => r.name === 'super_admin');
      if (roleData) {
        superAdminRole = await Role.create(roleData);
      }
    }

    if (!adminRole) {
      console.log('Creating admin role...');
      const defaultRoles = Role.getDefaultRoles ? Role.getDefaultRoles() : [];
      const roleData = defaultRoles.find(r => r.name === 'admin');
      if (roleData) {
        adminRole = await Role.create(roleData);
      }
    }

    if (!operatorRole) {
      console.log('Creating operator role...');
      const defaultRoles = Role.getDefaultRoles ? Role.getDefaultRoles() : [];
      const roleData = defaultRoles.find(r => r.name === 'operator');
      if (roleData) {
        operatorRole = await Role.create(roleData);
      }
    }

    // Delete existing users for this company
    await User.deleteMany({ company: company._id });
    console.log('Cleared existing users for this company\n');

    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash('admin123', 10);

    // Create Master Admin
    const masterAdmin = await User.create({
      firstName: 'Master',
      lastName: 'Admin',
      email: 'master@aksdigirec.com',
      password: defaultPassword,
      role: superAdminRole?._id || adminRole?._id,
      company: company._id,
      isActive: true,
    });
    console.log(`✓ Created Master Admin: ${masterAdmin.email}`);

    // Create Admin (Dashboard Main)
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Dashboard',
      email: 'admin@aksdigirec.com',
      password: defaultPassword,
      role: adminRole?._id || superAdminRole?._id,
      company: company._id,
      isActive: true,
    });
    console.log(`✓ Created Admin: ${admin.email}`);

    // Create Operator
    const operator = await User.create({
      firstName: 'Operator',
      lastName: 'User',
      email: 'operator@aksdigirec.com',
      password: defaultPassword,
      role: operatorRole?._id || adminRole?._id,
      company: company._id,
      isActive: true,
    });
    console.log(`✓ Created Operator: ${operator.email}`);

    console.log('\n========================================');
    console.log('Production Data Setup Complete!');
    console.log('========================================');
    console.log(`Company: ${company.name}`);
    console.log('Users created:');
    console.log('  1. Master Admin - master@aksdigirec.com / admin123');
    console.log('  2. Admin (Dashboard) - admin@aksdigirec.com / admin123');
    console.log('  3. Operator - operator@aksdigirec.com / admin123');
    console.log('========================================');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error setting up production data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

setupProductionData();
