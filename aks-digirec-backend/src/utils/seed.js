const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const logger = require('../config/logger');
const { Role, User, Company, Unit, MaterialType, Section } = require('../models');

const seedDatabase = async () => {
  await connectDB();
  try {
    logger.info('Starting database seed...');

    // Clear existing data (optional - be careful in production)
    // await Role.deleteMany({});
    // await User.deleteMany({});
    
    // Ensure super_admin role exists
    let superAdminRole = await Role.findOne({ name: 'super_admin' });
    if (!superAdminRole) {
      logger.info('Creating super_admin role...');
      const defaultRoles = Role.getDefaultRoles();
      const superAdminRoleData = defaultRoles.find(r => r.name === 'super_admin');
      if (superAdminRoleData) {
        superAdminRole = await Role.create(superAdminRoleData);
      } else {
        superAdminRole = await Role.create({
          name: 'super_admin',
          displayName: { en: 'Super Admin', ur: 'سپر ایڈمن' },
          permissions: [],
          isSystem: true,
          level: 100
        });
      }
      logger.info('Super admin role created');
    } else {
      logger.info('Roles already exist');
    }

    // Create default company for master data
    let defaultCompany = await Company.findOne({ code: 'AKS001' });
    if (!defaultCompany) {
      defaultCompany = await Company.create({
        name: 'AKS DigiRec Demo',
        code: 'AKS001',
        contactInfo: { email: 'demo@aksdigirec.com', phone: '+92-300-1234567' },
        address: { city: 'Lahore', country: 'Pakistan' },
        status: 'active',
        isActive: true
      });
      logger.info(`Default company created: ${defaultCompany.name}`);
    }

    // Seed default units and material types for the company
    const unitsCount = await Unit.countDocuments({ companyId: defaultCompany._id });
    if (unitsCount === 0) {
      const defaultUnits = Unit.getDefaultUnits(defaultCompany._id);
      await Unit.insertMany(defaultUnits);
      logger.info(`Created ${defaultUnits.length} default units`);
    }
    const materialTypesCount = await MaterialType.countDocuments({ companyId: defaultCompany._id });
    if (materialTypesCount === 0) {
      const defaultTypes = MaterialType.getDefaultTypes(defaultCompany._id);
      await MaterialType.insertMany(defaultTypes);
      logger.info(`Created ${defaultTypes.length} default material types`);
    }

    // Seed sample sections
    const sectionsCount = await Section.countDocuments({ companyId: defaultCompany._id });
    if (sectionsCount === 0) {
      await Section.insertMany([
        { companyId: defaultCompany._id, code: 'SEC0001', sectionGroup: 'Clay Group', mainSection: 'Clay Forming', subSection: 'Handle Making', isNonMaterial: false, name: { en: 'Clay Forming' } },
        { companyId: defaultCompany._id, code: 'SEC0002', sectionGroup: 'Kiln Group', mainSection: 'Firing', subSection: 'Kiln Operations', isNonMaterial: false, name: { en: 'Kiln Operations' } },
        { companyId: defaultCompany._id, code: 'SEC0003', sectionGroup: 'Packing Group', mainSection: 'Packaging', subSection: 'Final Packing', isNonMaterial: false, name: { en: 'Packaging' } },
      ]);
      logger.info('Created 3 sample sections');
    }

    if (!superAdminRole) {
      throw new Error('Super admin role not found after seed.');
    }
    const defaultEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@aks.com';
    const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';
    let superAdmin = await User.findOne({ email: defaultEmail });
    
    if (!superAdmin) {
      logger.info('Creating super admin user...');
      superAdmin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: defaultEmail,
        password: defaultPassword,
        role: superAdminRole._id,
        company: defaultCompany._id,
        isActive: true
      });
      logger.info(`Super admin created: ${superAdmin.email}`);
    } else {
      logger.info('Super admin already exists, skipping...');
    }

    logger.info('Database seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Database seed failed: ${error.message}`);
    process.exit(1);
  }
};

// Run seed
seedDatabase().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
