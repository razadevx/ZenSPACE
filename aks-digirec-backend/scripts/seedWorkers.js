/**
 * Seed Script for Test Workers
 * Run with: node scripts/seedWorkers.js
 * 
 * This script creates 20 test workers distributed across different section groups
 * for testing the attendance module.
 */

const mongoose = require('mongoose');
const { Worker, Section, Company, User, Role } = require('../src/models');
require('dotenv').config();

// Test worker data - 20 workers distributed across 5 section groups
const testWorkers = [
  // Clay Group - 4 workers
  { firstName: 'Ahmed', lastName: 'Hussain', code: 'CLY001', sectionGroup: 'Clay Group', hourlyRate: 250 },
  { firstName: 'Bilal', lastName: 'Khan', code: 'CLY002', sectionGroup: 'Clay Group', hourlyRate: 250 },
  { firstName: 'Faisal', lastName: 'Rehman', code: 'CLY003', sectionGroup: 'Clay Group', hourlyRate: 260 },
  { firstName: 'Imran', lastName: 'Malik', code: 'CLY004', sectionGroup: 'Clay Group', hourlyRate: 240 },
  
  // Flower Group - 4 workers
  { firstName: 'Ahsan', lastName: 'Raza', code: 'FLW001', sectionGroup: 'Flower Group', hourlyRate: 280 },
  { firstName: 'Waqar', lastName: 'Asif', code: 'FLW002', sectionGroup: 'Flower Group', hourlyRate: 270 },
  { firstName: 'Raza', lastName: 'Alam', code: 'FLW003', sectionGroup: 'Flower Group', hourlyRate: 280 },
  { firstName: 'Noman', lastName: 'Haider', code: 'FLW004', sectionGroup: 'Flower Group', hourlyRate: 270 },
  
  // Glaze & Color Group - 4 workers
  { firstName: 'Sajid', lastName: 'Mehmood', code: 'GLZ001', sectionGroup: 'Glaze & Color Group', hourlyRate: 300 },
  { firstName: 'Tariq', lastName: 'Aziz', code: 'GLZ002', sectionGroup: 'Glaze & Color Group', hourlyRate: 290 },
  { firstName: 'Kashif', lastName: 'Iqbal', code: 'GLZ003', sectionGroup: 'Glaze & Color Group', hourlyRate: 300 },
  { firstName: 'Asad', lastName: 'Ullah', code: 'GLZ004', sectionGroup: 'Glaze & Color Group', hourlyRate: 290 },
  
  // Kiln Group - 4 workers
  { firstName: 'Yasin', lastName: 'Khalid', code: 'KLN001', sectionGroup: 'Kiln Group', hourlyRate: 320 },
  { firstName: 'Zubair', lastName: 'Ahmed', code: 'KLN002', sectionGroup: 'Kiln Group', hourlyRate: 310 },
  { firstName: 'Naveed', lastName: 'Hassan', code: 'KLN003', sectionGroup: 'Kiln Group', hourlyRate: 320 },
  { firstName: 'Shahid', lastName: 'Javed', code: 'KLN004', sectionGroup: 'Kiln Group', hourlyRate: 310 },
  
  // Packing Group - 4 workers
  { firstName: 'Majid', lastName: 'Rashid', code: 'PCK001', sectionGroup: 'Packing Group', hourlyRate: 220 },
  { firstName: 'Rizwan', lastName: 'Qadir', code: 'PCK002', sectionGroup: 'Packing Group', hourlyRate: 230 },
  { firstName: 'Rukhab', lastName: 'User', code: 'PCK003', sectionGroup: 'Packing Group', hourlyRate: 220 },
  { firstName: 'Salman', lastName: 'Tariq', code: 'PCK004', sectionGroup: 'Packing Group', hourlyRate: 230 },
];

async function seedWorkers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digirec');
    console.log('Connected to MongoDB');

    // Get or create default company
    let company = await Company.findOne();
    if (!company) {
      console.log('Creating default company...');
      company = await Company.create({
        name: 'Test Company',
        code: 'TST001',
        email: 'admin@test.com',
        address: 'Test Address',
        phone: '1234567890',
        currency: 'PKR',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Asia/Karachi',
      });
    }
    console.log(`Using company: ${company.name} (${company._id})`);

    // Get or create admin role
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.log('Creating admin role...');
      const defaultRoles = Role.getDefaultRoles ? Role.getDefaultRoles() : [];
      const adminRoleData = defaultRoles.find(r => r.name === 'admin');
      if (adminRoleData) {
        adminRole = await Role.create(adminRoleData);
      } else {
        // Fallback: create minimal admin role
        adminRole = await Role.create({
          name: 'admin',
          displayName: { en: 'Admin', ur: 'ایڈمن' },
          description: { en: 'Company administrator', ur: 'کمپنی منتظم' },
          isSystem: true,
          level: 90,
        });
      }
    }
    console.log(`Using admin role: ${adminRole.name} (${adminRole._id})`);

    // Get or create admin user
    let adminUser = await User.findOne({ email: 'admin@test.com' });
    if (!adminUser) {
      console.log('Creating admin user...');
      const bcrypt = require('bcryptjs');
      adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        password: await bcrypt.hash('password123', 10),
        role: adminRole._id,
        company: company._id,
        isActive: true,
      });
    }
    console.log(`Using admin user: ${adminUser.email}`);

    // Create sections for each group if they don't exist
    const sectionGroups = [...new Set(testWorkers.map(w => w.sectionGroup))];
    const sectionMap = {};

    for (const groupName of sectionGroups) {
      let section = await Section.findOne({ 
        companyId: company._id, 
        sectionGroup: groupName 
      });
      
      if (!section) {
        console.log(`Creating section for ${groupName}...`);
        const sectionCode = groupName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
        section = await Section.create({
          companyId: company._id,
          code: sectionCode,
          name: {
            en: groupName,
            ur: groupName,
          },
          sectionGroup: groupName,
          description: {
            en: `${groupName} Section`,
            ur: `${groupName} Section`,
          },
          type: 'production',
          isActive: true,
        });
      }
      sectionMap[groupName] = section._id;
      console.log(`Section ${groupName}: ${section._id}`);
    }

    // Create workers
    console.log('\nCreating test workers...');
    const createdWorkers = [];
    const existingWorkers = [];

    for (const workerData of testWorkers) {
      // Check if worker already exists
      const existingWorker = await Worker.findOne({
        companyId: company._id,
        $or: [
          { code: workerData.code },
          { firstName: workerData.firstName, lastName: workerData.lastName }
        ]
      });

      if (existingWorker) {
        existingWorkers.push(existingWorker);
        console.log(`  ⚠ Worker ${workerData.firstName} ${workerData.lastName} (${workerData.code}) already exists`);
        continue;
      }

      // Create new worker with proper schema fields
      const worker = await Worker.create({
        companyId: company._id,
        firstName: workerData.firstName,
        lastName: workerData.lastName,
        code: workerData.code,
        department: sectionMap[workerData.sectionGroup],
        designation: 'Worker',
        workerType: 'permanent',
        status: 'active',
        wages: {
          type: 'hourly',
          amount: workerData.hourlyRate,
          currency: 'PKR',
          overtimeRate: workerData.hourlyRate * 1.5,
        },
        joinDate: new Date('2023-01-01'),
        phone: `03${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        address: {
          street: `${workerData.firstName}'s Address`,
          city: 'Lahore',
        },
        attendance: {
          present: 0,
          absent: 0,
          leave: 0,
          overtime: 0,
        },
      });

      createdWorkers.push(worker);
      console.log(`  ✓ Created ${workerData.firstName} ${workerData.lastName} (${workerData.code}) - ${workerData.sectionGroup}`);
    }

    console.log(`\n========================================`);
    console.log(`Seed Complete!`);
    console.log(`========================================`);
    console.log(`Total test workers: ${testWorkers.length}`);
    console.log(`Newly created: ${createdWorkers.length}`);
    console.log(`Already existed: ${existingWorkers.length}`);
    console.log(`\nSection Groups:`);
    sectionGroups.forEach(group => {
      const count = testWorkers.filter(w => w.sectionGroup === group).length;
      console.log(`  - ${group}: ${count} workers`);
    });
    console.log(`========================================`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding workers:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedWorkers();
