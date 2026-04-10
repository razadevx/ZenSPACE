/**
 * Seed Script for 10 Test Workers with Activities
 * Run with: node scripts/seedTestWorkers.js
 * 
 * This script creates 10 test workers distributed across 2 section groups
 * with sample activities and payments for testing.
 */

const mongoose = require('mongoose');
const { Worker, WorkerActivity, Section, Company, User, Role } = require('../src/models');
require('dotenv').config();

// 10 optimized test workers distributed across groups
const testWorkers = [
  // Clay Group - 5 workers
  { firstName: 'Ahmed', lastName: 'Hussain', code: 'CLAY001', sectionGroup: 'Clay Group', designation: 'Worker', hourlyRate: 250, workerType: 'permanent' },
  { firstName: 'Bilal', lastName: 'Khan', code: 'CLAY002', sectionGroup: 'Clay Group', designation: 'Worker', hourlyRate: 250, workerType: 'permanent' },
  { firstName: 'Faisal', lastName: 'Rehman', code: 'CLAY003', sectionGroup: 'Clay Group', designation: 'Lead', hourlyRate: 300, workerType: 'permanent' },
  { firstName: 'Imran', lastName: 'Malik', code: 'CLAY004', sectionGroup: 'Clay Group', designation: 'Worker', hourlyRate: 240, workerType: 'permanent' },
  { firstName: 'Hassan', lastName: 'Ali', code: 'CLAY005', sectionGroup: 'Clay Group', designation: 'Worker', hourlyRate: 235, workerType: 'daily_wage' },
  
  // Glaze & Color Group - 5 workers
  { firstName: 'Sajid', lastName: 'Mehmood', code: 'GLAZ001', sectionGroup: 'Glaze & Color Group', designation: 'Lead', hourlyRate: 300, workerType: 'permanent' },
  { firstName: 'Tariq', lastName: 'Aziz', code: 'GLAZ002', sectionGroup: 'Glaze & Color Group', designation: 'Worker', hourlyRate: 290, workerType: 'permanent' },
  { firstName: 'Kashif', lastName: 'Iqbal', code: 'GLAZ003', sectionGroup: 'Glaze & Color Group', designation: 'Worker', hourlyRate: 280, workerType: 'permanent' },
  { firstName: 'Asad', lastName: 'Ullah', code: 'GLAZ004', sectionGroup: 'Glaze & Color Group', designation: 'Worker', hourlyRate: 290, workerType: 'piece_rate' },
  { firstName: 'Nasir', lastName: 'Khan', code: 'GLAZ005', sectionGroup: 'Glaze & Color Group', designation: 'Worker', hourlyRate: 260, workerType: 'daily_wage' },
];

async function createTestActivities(worker, section, companyId, adminUser) {
  try {
    // Create activities for last 5 days
    const activities = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const activityDate = new Date(today);
      activityDate.setDate(activityDate.getDate() - i);
      activityDate.setHours(0, 0, 0, 0);

      const checkIn = new Date(activityDate);
      checkIn.setHours(8, 0, 0, 0);

      const checkOut = new Date(activityDate);
      checkOut.setHours(16, 0, 0, 0);

      let production = null;
      if (Math.random() > 0.3) {
        // 70% production activities
        production = {
          quantityProduced: Math.floor(Math.random() * 100) + 50,
          quantityApproved: Math.floor(Math.random() * 80) + 40,
          quantityRejected: Math.floor(Math.random() * 10)
        };
      }

      const activity = await WorkerActivity.create({
        companyId,
        workerId: worker._id,
        date: activityDate,
        activityType: 'production',
        timeTracking: {
          checkIn,
          checkOut,
          totalHours: 8
        },
        production,
        workDetails: {
          operation: 'Production',
          machineUsed: 'Line A',
          description: `Daily production work - ${worker.firstName}`
        },
        status: i > 2 ? 'approved' : 'pending', // Last 3 days approved
        approvedBy: i > 2 ? adminUser._id : null,
        approvedAt: i > 2 ? new Date() : null,
        createdBy: adminUser._id
      });

      activities.push(activity);
      console.log(`    Created activity for ${worker.code} on ${activityDate.toDateString()}`);
    }

    return activities;
  } catch (error) {
    console.error(`Error creating activities for worker ${worker.code}:`, error.message);
    return [];
  }
}

async function seedTestWorkers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digirec');
    console.log('Connected to MongoDB\n');

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
    console.log(`Using company: ${company.name} (${company._id})\n`);

    // Get or create admin role
    let adminRole = await Role.findOne({ name: 'admin', companyId: company._id });
    if (!adminRole) {
      adminRole = await Role.findOne({ name: 'admin' });
    }
    if (!adminRole) {
      console.log('Creating admin role...');
      adminRole = await Role.create({
        name: 'admin',
        displayName: { en: 'Admin', ur: 'ایڈمن' },
        description: { en: 'Company administrator', ur: 'کمپنی منتظم' },
        isSystem: true,
        level: 90,
      });
    }
    console.log(`Using admin role: ${adminRole.name} (${adminRole._id})\n`);

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
    console.log(`Using admin user: ${adminUser.email}\n`);

    // Create sections for each group if they don't exist
    const sectionGroups = [...new Set(testWorkers.map(w => w.sectionGroup))];
    const sectionMap = {};

    console.log('Setting up section groups...');
    for (const groupName of sectionGroups) {
      let section = await Section.findOne({ 
        companyId: company._id, 
        sectionGroup: groupName 
      });
      
      if (!section) {
        console.log(`  Creating section for ${groupName}...`);
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
      console.log(`  ✓ ${groupName}: ${section._id}`);
    }
    console.log('');

    // Create workers
    console.log('Creating test workers...');
    const createdWorkers = [];
    const existingWorkers = [];

    for (const workerData of testWorkers) {
      // Check if worker already exists
      const existingWorker = await Worker.findOne({
        companyId: company._id,
        code: workerData.code
      });

      if (existingWorker) {
        existingWorkers.push(existingWorker);
        console.log(`  ⚠ Worker ${workerData.code} already exists`);
        continue;
      }

      // Create new worker
      try {
        const worker = await Worker.create({
          companyId: company._id,
          firstName: workerData.firstName,
          lastName: workerData.lastName,
          code: workerData.code,
          department: sectionMap[workerData.sectionGroup],
          designation: workerData.designation,
          workerType: workerData.workerType,
          status: 'active',
          isActive: true,
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
          currentBalance: 0,
          createdBy: adminUser._id,
        });

        createdWorkers.push(worker);
        console.log(`  ✓ Created ${workerData.code} - ${worker.firstName} ${worker.lastName} (${workerData.sectionGroup})`);
      } catch (error) {
        console.error(`  ✗ Error creating ${workerData.code}:`, error.message);
      }
    }

    // Create test activities for newly created workers
    console.log('\nCreating test activities...');
    let totalActivities = 0;
    for (const worker of createdWorkers) {
      const workerData = testWorkers.find(w => w.code === worker.code);
      const section = await Section.findById(worker.department);
      const activities = await createTestActivities(worker, section, company._id, adminUser);
      totalActivities += activities.length;
    }

    // Print summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`SEED COMPLETE!`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Total workers defined: ${testWorkers.length}`);
    console.log(`Workers created: ${createdWorkers.length}`);
    console.log(`Workers already existed: ${existingWorkers.length}`);
    console.log(`Test activities created: ${totalActivities}`);
    console.log(`\nSection Groups:`);
    
    sectionGroups.forEach(group => {
      const count = createdWorkers.filter(w => {
        const wd = testWorkers.find(tw => tw.code === w.code);
        return wd?.sectionGroup === group;
      }).length;
      console.log(`  - ${group}: ${count} workers`);
    });

    console.log(`\nWorker Types Distribution:`);
    const typeCount = {};
    createdWorkers.forEach(w => {
      typeCount[w.workerType] = (typeCount[w.workerType] || 0) + 1;
    });
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} workers`);
    });

    console.log(`\nTest Data Summary:`);
    console.log(`  - Company: ${company.name}`);
    console.log(`  - Admin User: ${adminUser.email}`);
    console.log(`  - Test Activities: Last 5 days per worker`);
    console.log(`  - Activities Status: Last 3 days approved, First 2 days pending`);
    console.log(`${'='.repeat(50)}\n`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('FATAL Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedTestWorkers();
