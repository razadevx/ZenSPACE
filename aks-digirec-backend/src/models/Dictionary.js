const mongoose = require('mongoose');

const dictionarySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Key (unique identifier)
  key: {
    type: String,
    required: true,
    trim: true
  },
  // Module/Context
  context: {
    type: String,
    required: true,
    enum: [
      'general', 'auth', 'navigation', 'dashboard',
      'master', 'inventory', 'production', 'workers',
      'accounting', 'sales', 'purchase', 'cash',
      'bank', 'reports', 'settings', 'validation'
    ],
    default: 'general'
  },
  // Default translations (system)
  defaultTranslations: {
    en: { type: String, required: true },
    ur: { type: String }
  },
  // Custom translations (company specific)
  customTranslations: {
    en: String,
    ur: String
  },
  // Description
  description: String,
  // Usage count (for analytics)
  usageCount: {
    type: Number,
    default: 0
  },
  // Is this a system entry (cannot be deleted)
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
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

// Compound index
// For super admin (companyId can be null for system entries)
dictionarySchema.index({ companyId: 1, key: 1, context: 1 }, { unique: true, sparse: true });
dictionarySchema.index({ companyId: 1, context: 1 });

// Static method to get translation
// Static method to get translation
dictionarySchema.statics.getTranslation = async function(companyId, key, language = 'en', context = 'general') {
  const entry = await this.findOne({ companyId, key, context });
  
  if (!entry) {
    // Try to find in system defaults
    const systemEntry = await this.findOne({ companyId: null, key, context });
    if (systemEntry) {
      return systemEntry.defaultTranslations[language] || systemEntry.defaultTranslations.en || key;
    }
    return key;
  }
  
  // Return custom translation if available, otherwise default
  const custom = entry.customTranslations?.[language];
  if (custom) return custom;
  
  const default_ = entry.defaultTranslations?.[language];
  if (default_) return default_;
  
  return entry.defaultTranslations?.en || key;
};

// Static method to get all translations for a company
dictionarySchema.statics.getAllTranslations = async function(companyId, language = 'en') {
  const entries = await this.find({ 
    $or: [{ companyId }, { companyId: null, isSystem: true }],
    isActive: true
  });
  
  const translations = {};
  entries.forEach(entry => {
    translations[entry.key] = entry.customTranslations?.[language] || 
                              entry.defaultTranslations?.[language] || 
                              entry.defaultTranslations?.en || 
                              entry.key;
  });
  
  return translations;
};

// Static method to seed default dictionary
dictionarySchema.statics.seedDefaults = async function(companyId) {
  const defaults = [
    // General
    { key: 'app.name', context: 'general', defaultTranslations: { en: 'AKS DigiRec', ur: 'عکس ڈیجیٹل ریکارڈز' } },
    { key: 'app.tagline', context: 'general', defaultTranslations: { en: 'Digital Records for Ceramics', ur: 'سرامکس کے لیے ڈیجیٹل ریکارڈز' } },
    { key: 'common.save', context: 'general', defaultTranslations: { en: 'Save', ur: 'محفوظ کریں' } },
    { key: 'common.cancel', context: 'general', defaultTranslations: { en: 'Cancel', ur: 'منسوخ کریں' } },
    { key: 'common.edit', context: 'general', defaultTranslations: { en: 'Edit', ur: 'ترمیم کریں' } },
    { key: 'common.delete', context: 'general', defaultTranslations: { en: 'Delete', ur: 'حذف کریں' } },
    { key: 'common.search', context: 'general', defaultTranslations: { en: 'Search', ur: 'تلاش کریں' } },
    { key: 'common.filter', context: 'general', defaultTranslations: { en: 'Filter', ur: 'فلٹر' } },
    { key: 'common.export', context: 'general', defaultTranslations: { en: 'Export', ur: 'برآمد کریں' } },
    { key: 'common.print', context: 'general', defaultTranslations: { en: 'Print', ur: 'پرنٹ کریں' } },
    { key: 'common.submit', context: 'general', defaultTranslations: { en: 'Submit', ur: 'جمع کرائیں' } },
    { key: 'common.close', context: 'general', defaultTranslations: { en: 'Close', ur: 'بند کریں' } },
    { key: 'common.back', context: 'general', defaultTranslations: { en: 'Back', ur: 'واپس' } },
    { key: 'common.next', context: 'general', defaultTranslations: { en: 'Next', ur: 'آگے' } },
    { key: 'common.yes', context: 'general', defaultTranslations: { en: 'Yes', ur: 'ہاں' } },
    { key: 'common.no', context: 'general', defaultTranslations: { en: 'No', ur: 'نہیں' } },
    
    // Navigation
    { key: 'nav.dashboard', context: 'navigation', defaultTranslations: { en: 'Dashboard', ur: 'ڈیش بورڈ' } },
    { key: 'nav.master', context: 'navigation', defaultTranslations: { en: 'Master Data', ur: 'ماسٹر ڈیٹا' } },
    { key: 'nav.inventory', context: 'navigation', defaultTranslations: { en: 'Inventory', ur: 'انوینٹری' } },
    { key: 'nav.production', context: 'navigation', defaultTranslations: { en: 'Production', ur: 'پروڈکشن' } },
    { key: 'nav.workers', context: 'navigation', defaultTranslations: { en: 'Workers', ur: 'مزدور' } },
    { key: 'nav.sales', context: 'navigation', defaultTranslations: { en: 'Sales', ur: 'فروخت' } },
    { key: 'nav.purchase', context: 'navigation', defaultTranslations: { en: 'Purchase', ur: 'خریداری' } },
    { key: 'nav.accounting', context: 'navigation', defaultTranslations: { en: 'Accounting', ur: 'اکاؤنٹنگ' } },
    { key: 'nav.reports', context: 'navigation', defaultTranslations: { en: 'Reports', ur: 'رپورٹس' } },
    { key: 'nav.settings', context: 'navigation', defaultTranslations: { en: 'Settings', ur: 'ترتیبات' } },
    
    // Master Data
    { key: 'master.sections', context: 'master', defaultTranslations: { en: 'Sections', ur: 'سیکشنز' } },
    { key: 'master.materials', context: 'master', defaultTranslations: { en: 'Raw Materials', ur: 'خام مال' } },
    { key: 'master.workers', context: 'master', defaultTranslations: { en: 'Workers', ur: 'مزدور' } },
    { key: 'master.suppliers', context: 'master', defaultTranslations: { en: 'Suppliers', ur: 'سپلائرز' } },
    { key: 'master.customers', context: 'master', defaultTranslations: { en: 'Customers', ur: 'صارفین' } },
    { key: 'master.products', context: 'master', defaultTranslations: { en: 'Products', ur: 'مصنوعات' } },
    
    // Accounting
    { key: 'accounting.ledger', context: 'accounting', defaultTranslations: { en: 'Ledger', ur: 'لیجر' } },
    { key: 'accounting.journal', context: 'accounting', defaultTranslations: { en: 'Journal', ur: 'جریدہ' } },
    { key: 'accounting.trial_balance', context: 'accounting', defaultTranslations: { en: 'Trial Balance', ur: 'آزمائشی بیلنس' } },
    { key: 'accounting.balance_sheet', context: 'accounting', defaultTranslations: { en: 'Balance Sheet', ur: 'بیلنس شیٹ' } },
    { key: 'accounting.profit_loss', context: 'accounting', defaultTranslations: { en: 'Profit & Loss', ur: 'نفع نقصان' } },
    
    // Validation
    { key: 'validation.required', context: 'validation', defaultTranslations: { en: 'This field is required', ur: 'یہ فیلڈ ضروری ہے' } },
    { key: 'validation.invalid_email', context: 'validation', defaultTranslations: { en: 'Invalid email address', ur: 'غلط ای میل ایڈریس' } },
    { key: 'validation.min_length', context: 'validation', defaultTranslations: { en: 'Minimum length not met', ur: 'کم ازکم لمبائی پوری نہیں' } },
    { key: 'validation.max_length', context: 'validation', defaultTranslations: { en: 'Maximum length exceeded', ur: 'زیادہ سے زیادہ لمبائی سے تجاوز' } }
  ];
  
  const operations = defaults.map(d => ({
    updateOne: {
      filter: { companyId, key: d.key, context: d.context },
      update: { $setOnInsert: { ...d, companyId, isSystem: true } },
      upsert: true
    }
  }));
  
  await this.bulkWrite(operations);
};

module.exports = mongoose.model('Dictionary', dictionarySchema);
