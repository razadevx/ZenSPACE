// Core Models
const User = require('./User');
const Company = require('./Company');
const Role = require('./Role');
const UserPreferences = require('./UserPreferences');
const AuditLog = require('./AuditLog');

// Accounting Models
const AccountGroup = require('./AccountGroup');
const LedgerAccount = require('./LedgerAccount');
const FiscalYear = require('./FiscalYear');
const LedgerTransaction = require('./LedgerTransaction');
const LedgerEntry = require('./LedgerEntry');

// Master Data Models
const Section = require('./Section');
const Unit = require('./Unit');
const MaterialType = require('./MaterialType');
const RawMaterial = require('./RawMaterial');
const Worker = require('./Worker');
const Supplier = require('./Supplier');
const Customer = require('./Customer');
const FinishedGood = require('./FinishedGood');

// Inventory Models
const StockLedger = require('./StockLedger');
const ProcessedStock = require('./ProcessedStock');

// Worker Models
const WorkerActivity = require('./WorkerActivity');
const WorkerPayment = require('./WorkerPayment');
const Attendance = require('./Attendance');

// Composition Models
const Composition = require('./Composition');
const BallMill = require('./BallMill');
const BallMillBatch = require('./BallMillBatch');

// Production Models
const ProductionBatch = require('./ProductionBatch');

// Cash/Bank Models
const SaleInvoice = require('./SaleInvoice');
const PurchaseInvoice = require('./PurchaseInvoice');
const CashTransaction = require('./CashTransaction');
const BankAccount = require('./BankAccount');
const BankTransaction = require('./BankTransaction');

// Dictionary Model
const Dictionary = require('./Dictionary');

module.exports = {
  // Core
  User,
  Company,
  Role,
  UserPreferences,
  AuditLog,
  
  // Accounting
  AccountGroup,
  LedgerAccount,
  FiscalYear,
  LedgerTransaction,
  LedgerEntry,
  
  // Master Data
  Section,
  Unit,
  MaterialType,
  RawMaterial,
  Worker,
  Supplier,
  Customer,
  FinishedGood,
  
  // Inventory
  StockLedger,
  ProcessedStock,
  
  // Workers
  WorkerActivity,
  WorkerPayment,
  Attendance,
  
  // Composition
  Composition,
  BallMill,
  BallMillBatch,
  
  // Production
  ProductionBatch,
  
  // Cash/Bank
  SaleInvoice,
  PurchaseInvoice,
  CashTransaction,
  BankAccount,
  BankTransaction,
  
  // Dictionary
  Dictionary
};
