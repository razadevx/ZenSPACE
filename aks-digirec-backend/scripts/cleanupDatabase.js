/**
 * Database Cleanup Script
 * Run with: node scripts/cleanupDatabase.js
 * 
 * This script:
 * 1. Keeps only "AKS DigiRec Demo" company
 * 2. Keeps only 3 users: Master Admin, Admin (Dashboard Main), Operator
 * 3. Deletes all related data for removed companies
 */

const mongoose = require('mongoose');
const models = require('../src/models');
require('dotenv').config();

const {
  Worker, Section, Company, User, Role, Attendance,
  AccountGroup, AuditLog, BallMill, BallMillBatch,
  BankAccount, BankTransaction, CashTransaction,
  Composition, Customer, Dictionary, FinishedGood,
  FiscalYear, LedgerAccount, LedgerEntry, LedgerTransaction,
  MaterialType, ProcessedStock, ProductionBatch,
  PurchaseInvoice, RawMaterial, SaleInvoice,
  StockLedger, Supplier, Unit, UserPreferences,
  WorkerActivity, WorkerPayment
} = models;

async function cleanupDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digirec');
    console.log('Connected to MongoDB\n');

    // Find the company to keep - try to find "DigiRec" or "AKS" or similar
    let companyToKeep = await Company.findOne({ name: /DigiRec/i });
    
    // If not found, try other patterns
    if (!companyToKeep) {
      companyToKeep = await Company.findOne({ name: /AKS/i });
    }
    
    // If still not found, get the first non-test company
    if (!companyToKeep) {
      companyToKeep = await Company.findOne({ name: { $not: /Test/i } });
    }
    
    // Last resort - keep the first company
    if (!companyToKeep) {
      companyToKeep = await Company.findOne();
    }
    
    if (!companyToKeep) {
      console.error('ERROR: No companies found in database!');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`Company to keep: ${companyToKeep.name} (${companyToKeep._id})\n`);

    // Get all companies except the one to keep
    const companiesToDelete = await Company.find({
      _id: { $ne: companyToKeep._id }
    });
    
    console.log(`Companies to delete: ${companiesToDelete.length}`);
    companiesToDelete.forEach(c => console.log(`  - ${c.name} (${c._id})`));
    console.log();

    const companyIdsToDelete = companiesToDelete.map(c => c._id);

    // Find users to keep (Master Admin, Admin, Operator)
    // Get all users first
    const allUsers = await User.find({}).populate('role', 'name');
    console.log('All users found:');
    allUsers.forEach(u => console.log(`  - ${u.firstName} ${u.lastName} (${u.email}) - Role: ${u.role?.name || 'N/A'}`));
    console.log();

    // Identify users to keep
    const usersToKeep = [];
    
    // Find Master Admin
    const masterAdmin = allUsers.find(u => 
      u.role?.name === 'super_admin' || 
      u.email?.toLowerCase().includes('master') ||
      u.email?.toLowerCase().includes('super')
    );
    if (masterAdmin) usersToKeep.push(masterAdmin);
    
    // Find Admin (Dashboard Main) - an admin role user
    const admin = allUsers.find(u => 
      u.role?.name === 'admin' && 
      !usersToKeep.includes(u)
    );
    if (admin) usersToKeep.push(admin);
    
    // Find Operator
    const operator = allUsers.find(u => 
      u.role?.name === 'operator' || 
      u.email?.toLowerCase().includes('operator')
    );
    if (operator) usersToKeep.push(operator);
    
    console.log('Users to keep:');
    usersToKeep.forEach(u => console.log(`  ✓ ${u.firstName} ${u.lastName} (${u.email}) - ${u.role?.name}`));
    console.log();

    // Get users to delete
    const userIdsToKeep = usersToKeep.map(u => u._id.toString());
    const usersToDelete = allUsers.filter(u => !userIdsToKeep.includes(u._id.toString()));
    
    console.log(`Users to delete: ${usersToDelete.length}`);
    usersToDelete.forEach(u => console.log(`  ✗ ${u.firstName} ${u.lastName} (${u.email})`));
    console.log();

    // ========== DELETE OPERATIONS ==========
    
    const deleteForCompanies = async (model, name) => {
      if (!model) return 0;
      try {
        const result = await model.deleteMany({
          $or: [
            { companyId: { $in: companyIdsToDelete } },
            { company: { $in: companyIdsToDelete } }
          ]
        });
        if (result.deletedCount > 0) {
          console.log(`Deleted ${result.deletedCount} ${name}`);
        }
        return result.deletedCount;
      } catch (e) {
        return 0;
      }
    };

    // Delete all company-related data
    await deleteForCompanies(AccountGroup, 'account groups');
    await deleteForCompanies(AuditLog, 'audit logs');
    await deleteForCompanies(BallMill, 'ball mills');
    await deleteForCompanies(BallMillBatch, 'ball mill batches');
    await deleteForCompanies(BankAccount, 'bank accounts');
    await deleteForCompanies(BankTransaction, 'bank transactions');
    await deleteForCompanies(CashTransaction, 'cash transactions');
    await deleteForCompanies(Composition, 'compositions');
    await deleteForCompanies(Customer, 'customers');
    await deleteForCompanies(Dictionary, 'dictionary entries');
    await deleteForCompanies(FinishedGood, 'finished goods');
    await deleteForCompanies(FiscalYear, 'fiscal years');
    await deleteForCompanies(LedgerAccount, 'ledger accounts');
    await deleteForCompanies(LedgerEntry, 'ledger entries');
    await deleteForCompanies(LedgerTransaction, 'ledger transactions');
    await deleteForCompanies(MaterialType, 'material types');
    await deleteForCompanies(ProcessedStock, 'processed stocks');
    await deleteForCompanies(ProductionBatch, 'production batches');
    await deleteForCompanies(PurchaseInvoice, 'purchase invoices');
    await deleteForCompanies(RawMaterial, 'raw materials');
    await deleteForCompanies(SaleInvoice, 'sale invoices');
    await deleteForCompanies(Section, 'sections');
    await deleteForCompanies(StockLedger, 'stock ledgers');
    await deleteForCompanies(Supplier, 'suppliers');
    await deleteForCompanies(Unit, 'units');
    await deleteForCompanies(Worker, 'workers');
    await deleteForCompanies(WorkerActivity, 'worker activities');
    await deleteForCompanies(WorkerPayment, 'worker payments');
    await deleteForCompanies(Attendance, 'attendance records');
    await deleteForCompanies(UserPreferences, 'user preferences');

    // Delete users that are not in the keep list
    const usersDeleteResult = await User.deleteMany({
      _id: { $nin: usersToKeep.map(u => u._id) }
    });
    console.log(`Deleted ${usersDeleteResult.deletedCount} users`);

    // Delete companies
    const companiesDeleteResult = await Company.deleteMany({
      _id: { $in: companyIdsToDelete }
    });
    console.log(`Deleted ${companiesDeleteResult.deletedCount} companies`);

    // Update remaining users to belong to the kept company
    const usersUpdateResult = await User.updateMany(
      {},
      { $set: { company: companyToKeep._id } }
    );
    console.log(`Updated ${usersUpdateResult.modifiedCount} users to belong to ${companyToKeep.name}`);

    console.log('\n========================================');
    console.log('Database Cleanup Complete!');
    console.log('========================================');
    console.log(`Company kept: ${companyToKeep.name}`);
    console.log(`Users kept: ${usersToKeep.length}`);
    console.log('\nRemaining data:');
    
    const remainingWorkers = await Worker.countDocuments({ companyId: companyToKeep._id });
    const remainingSections = await Section.countDocuments({ companyId: companyToKeep._id });
    const remainingUsers = await User.countDocuments();
    const remainingAttendance = await Attendance.countDocuments({ companyId: companyToKeep._id });
    
    console.log(`  - Workers: ${remainingWorkers}`);
    console.log(`  - Sections: ${remainingSections}`);
    console.log(`  - Users: ${remainingUsers}`);
    console.log(`  - Attendance records: ${remainingAttendance}`);
    console.log('========================================');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error cleaning up database:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the cleanup function
cleanupDatabase();
