const mongoose = require('mongoose');

const accountGroupSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Account group code is required'],
    trim: true,
    uppercase: true
  },
  name: {
    en: { type: String, required: true },
    ur: { type: String }
  },
  type: {
    type: String,
    required: true,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      // Assets
      'current_asset', 'fixed_asset', 'intangible_asset', 'other_asset',
      // Liabilities
      'current_liability', 'long_term_liability', 'other_liability',
      // Equity
      'capital', 'retained_earnings', 'reserves',
      // Revenue
      'sales_revenue', 'other_revenue', 'discount_received',
      // Expense
      'cost_of_goods_sold', 'operating_expense', 'administrative_expense',
      'selling_expense', 'financial_expense', 'other_expense'
    ]
  },
  parentGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountGroup',
    default: null
  },
  level: {
    type: Number,
    default: 1
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  normalBalance: {
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },
  description: {
    en: String,
    ur: String
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
  timestamps: true
});

// Compound index for unique code per company
accountGroupSchema.index({ companyId: 1, code: 1 }, { unique: true });

// Static method to get default account groups
accountGroupSchema.statics.getDefaultGroups = function(companyId) {
  return [
    // Assets
    { companyId, code: '1000', name: { en: 'Assets', ur: 'اثاثے' }, type: 'asset', category: 'current_asset', normalBalance: 'debit', isSystem: true, level: 1 },
    { companyId, code: '1100', name: { en: 'Current Assets', ur: 'موجودہ اثاثے' }, type: 'asset', category: 'current_asset', normalBalance: 'debit', isSystem: true, level: 2 },
    { companyId, code: '1110', name: { en: 'Cash & Bank', ur: 'نقد اور بینک' }, type: 'asset', category: 'current_asset', normalBalance: 'debit', isSystem: true, level: 3 },
    { companyId, code: '1120', name: { en: 'Accounts Receivable', ur: 'وصولیوں کا کھاتہ' }, type: 'asset', category: 'current_asset', normalBalance: 'debit', isSystem: true, level: 3 },
    { companyId, code: '1130', name: { en: 'Inventory', ur: 'اسٹاک' }, type: 'asset', category: 'current_asset', normalBalance: 'debit', isSystem: true, level: 3 },
    { companyId, code: '1200', name: { en: 'Fixed Assets', ur: 'قائم اثاثے' }, type: 'asset', category: 'fixed_asset', normalBalance: 'debit', isSystem: true, level: 2 },
    
    // Liabilities
    { companyId, code: '2000', name: { en: 'Liabilities', ur: 'ذمہ داریاں' }, type: 'liability', category: 'current_liability', normalBalance: 'credit', isSystem: true, level: 1 },
    { companyId, code: '2100', name: { en: 'Current Liabilities', ur: 'موجودہ ذمہ داریاں' }, type: 'liability', category: 'current_liability', normalBalance: 'credit', isSystem: true, level: 2 },
    { companyId, code: '2110', name: { en: 'Accounts Payable', ur: 'ادائیگیوں کا کھاتہ' }, type: 'liability', category: 'current_liability', normalBalance: 'credit', isSystem: true, level: 3 },
    { companyId, code: '2200', name: { en: 'Long Term Liabilities', ur: 'طویل مدتی ذمہ داریاں' }, type: 'liability', category: 'long_term_liability', normalBalance: 'credit', isSystem: true, level: 2 },
    
    // Equity
    { companyId, code: '3000', name: { en: 'Equity', ur: 'سرمایہ' }, type: 'equity', category: 'capital', normalBalance: 'credit', isSystem: true, level: 1 },
    { companyId, code: '3100', name: { en: 'Capital', ur: 'مالیات' }, type: 'equity', category: 'capital', normalBalance: 'credit', isSystem: true, level: 2 },
    { companyId, code: '3200', name: { en: 'Retained Earnings', ur: 'محفوظ شدہ آمدنی' }, type: 'equity', category: 'retained_earnings', normalBalance: 'credit', isSystem: true, level: 2 },
    
    // Revenue
    { companyId, code: '4000', name: { en: 'Revenue', ur: 'آمدنی' }, type: 'revenue', category: 'sales_revenue', normalBalance: 'credit', isSystem: true, level: 1 },
    { companyId, code: '4100', name: { en: 'Sales Revenue', ur: 'فروخت کی آمدنی' }, type: 'revenue', category: 'sales_revenue', normalBalance: 'credit', isSystem: true, level: 2 },
    { companyId, code: '4200', name: { en: 'Other Revenue', ur: 'دیگر آمدنی' }, type: 'revenue', category: 'other_revenue', normalBalance: 'credit', isSystem: true, level: 2 },
    
    // Expenses
    { companyId, code: '5000', name: { en: 'Expenses', ur: 'اخراجات' }, type: 'expense', category: 'cost_of_goods_sold', normalBalance: 'debit', isSystem: true, level: 1 },
    { companyId, code: '5100', name: { en: 'Cost of Goods Sold', ur: 'فروخت شدہ سامان کی قیمت' }, type: 'expense', category: 'cost_of_goods_sold', normalBalance: 'debit', isSystem: true, level: 2 },
    { companyId, code: '5200', name: { en: 'Operating Expenses', ur: 'آپریٹنگ اخراجات' }, type: 'expense', category: 'operating_expense', normalBalance: 'debit', isSystem: true, level: 2 },
    { companyId, code: '5210', name: { en: 'Labour Expenses', ur: 'مزدوری کے اخراجات' }, type: 'expense', category: 'operating_expense', normalBalance: 'debit', isSystem: true, level: 3 },
    { companyId, code: '5300', name: { en: 'Administrative Expenses', ur: 'انتظامی اخراجات' }, type: 'expense', category: 'administrative_expense', normalBalance: 'debit', isSystem: true, level: 2 },
    { companyId, code: '5400', name: { en: 'Selling Expenses', ur: 'فروخت کے اخراجات' }, type: 'expense', category: 'selling_expense', normalBalance: 'debit', isSystem: true, level: 2 }
  ];
};

module.exports = mongoose.model('AccountGroup', accountGroupSchema);
