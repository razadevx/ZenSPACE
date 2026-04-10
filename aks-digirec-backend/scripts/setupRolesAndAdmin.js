const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Role, User, Company } = require('../src/models');
require('dotenv').config();

async function setupRolesAndAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digirec');
    
    console.log('Setting up roles and admin user...\n');
    
    // Get the main AKS DigiRec Demo company (the one with 5 workers)
    const company = await Company.findOne({ name: 'AKS DigiRec Demo', code: 'AKS001' });
    if (!company) {
      console.error('Company not found!');
      process.exit(1);
    }
    console.log(`✓ Using company: ${company.name} (${company._id})\n`);
    
    // Get default roles from the model
    const defaultRoles = Role.getDefaultRoles();
    
    console.log('Setting up roles...\n');
    const createdRoles = {};
    
    for (const roleData of defaultRoles) {
      let role = await Role.findOne({ name: roleData.name });
      
      if (role) {
        console.log(`  ✓ Role exists: ${roleData.name}`);
      } else {
        role = await Role.create(roleData);
        console.log(`  ✓ Created role: ${roleData.name}`);
      }
      
      createdRoles[roleData.name] = role;
    }
    
    // Set up admin user
    console.log('\nSetting up Admin User...\n');
    
    let adminUser = await User.findOne({ email: 'admin@digirec.com' });
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);
    
    if (adminUser) {
      adminUser.password = hashedPassword;
      adminUser.role = createdRoles.admin._id;
      adminUser.company = company._id;
      adminUser.isActive = true;
      adminUser.firstName = 'Admin';
      adminUser.lastName = 'User';
      await adminUser.save();
      console.log('  ✓ Updated admin user: admin@digirec.com');
    } else {
      adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@digirec.com',
        password: hashedPassword,
        role: createdRoles.admin._id,
        company: company._id,
        isActive: true,
      });
      console.log('  ✓ Created admin user: admin@digirec.com');
    }
    
    // Set up operator user
    console.log('\nSetting up Operator User...\n');
    
    let operatorUser = await User.findOne({ email: 'operator@digirec.com' });
    const operatorPassword = await bcrypt.hash('Operator@123456', 10);
    
    if (operatorUser) {
      operatorUser.password = operatorPassword;
      operatorUser.role = createdRoles.operator._id;
      operatorUser.company = company._id;
      operatorUser.isActive = true;
      operatorUser.firstName = 'Operator';
      operatorUser.lastName = 'User';
      await operatorUser.save();
      console.log('  ✓ Updated operator user: operator@digirec.com');
    } else {
      operatorUser = await User.create({
        firstName: 'Operator',
        lastName: 'User',
        email: 'operator@digirec.com',
        password: operatorPassword,
        role: createdRoles.operator._id,
        company: company._id,
        isActive: true,
      });
      console.log('  ✓ Created operator user: operator@digirec.com');
    }
    
    // Print credentials summary
    console.log('\n' + '='.repeat(65));
    console.log('✓ ROLES & CREDENTIALS SETUP COMPLETE');
    console.log('='.repeat(65));
    
    console.log('\nROLES CREATED:');
    console.log('  ✓ Super Admin (Level 100) - Full system access');
    console.log('  ✓ Admin (Level 90) - Company-wide access');
    console.log('  ✓ Manager (Level 70) - Department manager access');
    console.log('  ✓ Accountant (Level 50) - Accounting staff access');
    console.log('  ✓ Operator (Level 30) - Limited operational access');
    console.log('  ✓ Viewer (Level 10) - Read-only access');
    
    console.log('\n' + '-'.repeat(65));
    console.log('ADMIN USER (Primary):');
    console.log('-'.repeat(65));
    console.log(`  Email:    admin@digirec.com`);
    console.log(`  Password: Admin@123456`);
    console.log(`  Role:     Admin (Company-wide access)`);
    console.log(`  Company:  ${company.name}`);
    
    console.log('\n' + '-'.repeat(65));
    console.log('OPERATOR USER (Demo):');
    console.log('-'.repeat(65));
    console.log(`  Email:    operator@digirec.com`);
    console.log(`  Password: Operator@123456`);
    console.log(`  Role:     Operator (Limited access)`);
    console.log(`  Company:  ${company.name}`);
    
    console.log('\n' + '='.repeat(65));
    console.log('Next Steps:');
    console.log('  1. Log in with admin@digirec.com / Admin@123456');
    console.log('  2. Go to Workers Activity page');
    console.log('  3. Run: node scripts/seedTestWorkers.js');
    console.log('     (Update it to use company ID: ' + company._id + ')');
    console.log('='.repeat(65) + '\n');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupRolesAndAdmin();
