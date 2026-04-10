const mongoose = require('mongoose');

const ledgerAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Account code is required'],
    trim: true,
    uppercase: true
  },
  name: {
    en: { type: String, required: true },
    ur: { type: String }
  },
  accountGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountGroup',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    index: true
  },
  subType: {
    type: String,
    enum: [
      'cash', 'bank', 'receivable', 'payable', 'inventory',
      'fixed_asset', 'capital', 'revenue', 'expense',
      'customer', 'supplier', 'worker'
    ]
  },
  // Entity linking for dynamic accounts (customer, supplier, worker)
  entityType: {
    type: String,
    enum: ['customer', 'supplier', 'worker', 'bank_account', 'cash_account', 'expense_category', null],
    default: null
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  // Account configuration
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBankAccount: {
    type: Boolean,
    default: false
  },
  isCashAccount: {
    type: Boolean,
    default: false
  },
  // Opening balance
  openingBalance: {
    amount: { type: Number, default: 0 },
    date: { type: Date },
    type: { type: String, enum: ['debit', 'credit'], default: 'debit' }
  },
  // Current balance (calculated)
  currentBalance: {
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    net: { type: Number, default: 0 } // positive = debit balance, negative = credit balance
  },
  // For bank accounts
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountTitle: String,
    branchName: String,
    branchCode: String,
    iban: String,
    swiftCode: String
  },
  // Credit limit for customers/suppliers
  creditLimit: {
    amount: { type: Number, default: 0 },
    warningAt: { type: Number, default: 80 } // percentage
  },
  // Cost center
  costCenter: {
    type: String,
    trim: true
  },
  // Notes
  description: {
    en: String,
    ur: String
  },
  notes: String,
  // Parent account for sub-accounts
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount',
    default: null
  },
  level: {
    type: Number,
    default: 1
  },
  // Fiscal year tracking
  fiscalYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FiscalYear'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
ledgerAccountSchema.index({ companyId: 1, code: 1 }, { unique: true });
ledgerAccountSchema.index({ companyId: 1, accountGroup: 1 });
ledgerAccountSchema.index({ companyId: 1, entityType: 1, entityId: 1 });
ledgerAccountSchema.index({ companyId: 1, type: 1, isActive: 1 });
ledgerAccountSchema.index({ 'name.en': 'text', 'name.ur': 'text', code: 'text' });

// Virtual for balance type
ledgerAccountSchema.virtual('balanceType').get(function() {
  return this.currentBalance.net >= 0 ? 'debit' : 'credit';
});

// Virtual for absolute balance
ledgerAccountSchema.virtual('absoluteBalance').get(function() {
  return Math.abs(this.currentBalance.net);
});

// Pre-save middleware to update net balance
ledgerAccountSchema.pre('save', function(next) {
  this.currentBalance.net = this.currentBalance.debit - this.currentBalance.credit;
  next();
});

// Static method to get default accounts for a company
ledgerAccountSchema.statics.getDefaultAccounts = function(companyId, accountGroups) {
  const findGroup = (code) => accountGroups.find(g => g.code === code);
  
  return [
    // Cash & Bank Accounts
    { companyId, code: '111001', name: { en: 'Cash in Hand', ur: 'نقد در دست' }, accountGroup: findGroup('1110')?._id, type: 'asset', subType: 'cash', isCashAccount: true, isSystem: true },
    { companyId, code: '111002', name: { en: 'Petty Cash', ur: 'پٹی کیش' }, accountGroup: findGroup('1110')?._id, type: 'asset', subType: 'cash', isCashAccount: true, isSystem: true },
    
    // Receivables
    { companyId, code: '112001', name: { en: 'Accounts Receivable', ur: 'وصولیوں کا کھاتہ' }, accountGroup: findGroup('1120')?._id, type: 'asset', subType: 'receivable', isSystem: true },
    { companyId, code: '112002', name: { en: 'Advances to Suppliers', ur: 'سپلائرز کو ایڈوانس' }, accountGroup: findGroup('1120')?._id, type: 'asset', subType: 'receivable', isSystem: true },
    
    // Inventory
    { companyId, code: '113001', name: { en: 'Raw Materials Inventory', ur: 'خام مال کا اسٹاک' }, accountGroup: findGroup('1130')?._id, type: 'asset', subType: 'inventory', isSystem: true },
    { companyId, code: '113002', name: { en: 'Work in Process', ur: 'زیر تکمیل کام' }, accountGroup: findGroup('1130')?._id, type: 'asset', subType: 'inventory', isSystem: true },
    { companyId, code: '113003', name: { en: 'Finished Goods Inventory', ur: 'تیار شدہ سامان کا اسٹاک' }, accountGroup: findGroup('1130')?._id, type: 'asset', subType: 'inventory', isSystem: true },
    
    // Payables
    { companyId, code: '211001', name: { en: 'Accounts Payable', ur: 'ادائیگیوں کا کھاتہ' }, accountGroup: findGroup('2110')?._id, type: 'liability', subType: 'payable', isSystem: true },
    { companyId, code: '211002', name: { en: 'Advances from Customers', ur: 'صارفین سے ایڈوانس' }, accountGroup: findGroup('2110')?._id, type: 'liability', subType: 'payable', isSystem: true },
    
    // Capital
    { companyId, code: '310001', name: { en: 'Owner Capital', ur: 'مالک کی سرمایہ' }, accountGroup: findGroup('3100')?._id, type: 'equity', subType: 'capital', isSystem: true },
    { companyId, code: '310002', name: { en: 'Drawings', ur: 'نکاسیاں' }, accountGroup: findGroup('3100')?._id, type: 'equity', subType: 'capital', isSystem: true },
    
    // Revenue
    { companyId, code: '410001', name: { en: 'Sales Revenue', ur: 'فروخت کی آمدنی' }, accountGroup: findGroup('4100')?._id, type: 'revenue', subType: 'revenue', isSystem: true },
    { companyId, code: '410002', name: { en: 'Sales Returns', ur: 'فروخت واپسی' }, accountGroup: findGroup('4100')?._id, type: 'revenue', subType: 'revenue', isSystem: true },
    { companyId, code: '420001', name: { en: 'Other Income', ur: 'دیگر آمدنی' }, accountGroup: findGroup('4200')?._id, type: 'revenue', subType: 'revenue', isSystem: true },
    
    // Expenses
    { companyId, code: '510001', name: { en: 'Cost of Goods Sold', ur: 'فروخت شدہ سامان کی قیمت' }, accountGroup: findGroup('5100')?._id, type: 'expense', subType: 'expense', isSystem: true },
    { companyId, code: '521001', name: { en: 'Direct Labour', ur: 'براہ راست مزدوری' }, accountGroup: findGroup('5210')?._id, type: 'expense', subType: 'expense', isSystem: true },
    { companyId, code: '521002', name: { en: 'Indirect Labour', ur: 'بالواسطہ مزدوری' }, accountGroup: findGroup('5210')?._id, type: 'expense', subType: 'expense', isSystem: true },
    { companyId, code: '530001', name: { en: 'Rent Expense', ur: 'کرایہ کا خرچہ' }, accountGroup: findGroup('5300')?._id, type: 'expense', subType: 'expense', isSystem: true },
    { companyId, code: '530002', name: { en: 'Utilities Expense', ur: 'افادیت کا خرچہ' }, accountGroup: findGroup('5300')?._id, type: 'expense', subType: 'expense', isSystem: true },
    { companyId, code: '530003', name: { en: 'Salaries & Wages', ur: 'تنخواہیں اور اجرتیں' }, accountGroup: findGroup('5300')?._id, type: 'expense', subType: 'expense', isSystem: true },
    { companyId, code: '540001', name: { en: 'Advertising Expense', ur: 'اشاعت کا خرچہ' }, accountGroup: findGroup('5400')?._id, type: 'expense', subType: 'expense', isSystem: true },
    { companyId, code: '540002', name: { en: 'Commission Expense', ur: 'کمیشن کا خرچہ' }, accountGroup: findGroup('5400')?._id, type: 'expense', subType: 'expense', isSystem: true }
  ].filter(acc => acc.accountGroup); // Only return accounts with valid account groups
};

// Static method to find or create entity account
ledgerAccountSchema.statics.findOrCreateEntityAccount = async function(companyId, entityType, entityId, entityName, accountGroupCode) {
  let account = await this.findOne({ companyId, entityType, entityId });
  
  if (account) {
    return account;
  }
  
  // Get account group
  const AccountGroup = require('./AccountGroup');
  const accountGroup = await AccountGroup.findOne({ companyId, code: accountGroupCode });
  
  if (!accountGroup) {
    throw new Error(`Account group ${accountGroupCode} not found`);
  }
  
  // Generate unique code
  const count = await this.countDocuments({ companyId, code: new RegExp(`^${accountGroupCode}`) });
  const code = `${accountGroupCode}${String(count + 1).padStart(3, '0')}`;
  
  // Create new account
  account = await this.create({
    companyId,
    code,
    name: { en: entityName, ur: entityName },
    accountGroup: accountGroup._id,
    type: accountGroup.type,
    entityType,
    entityId,
    isSystem: false
  });
  
  return account;
};

// Method to update balance
ledgerAccountSchema.methods.updateBalance = async function(debitAmount = 0, creditAmount = 0) {
  this.currentBalance.debit += debitAmount;
  this.currentBalance.credit += creditAmount;
  this.currentBalance.net = this.currentBalance.debit - this.currentBalance.credit;
  await this.save();
};

module.exports = mongoose.model('LedgerAccount', ledgerAccountSchema);
