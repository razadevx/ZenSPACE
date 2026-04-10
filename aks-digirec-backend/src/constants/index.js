/**
 * User Roles
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

/**
 * Company Status
 */
const COMPANY_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled'
};

/**
 * Account Types
 */
const ACCOUNT_TYPES = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
  REVENUE: 'revenue',
  EXPENSE: 'expense'
};

/**
 * Transaction Types
 */
const TRANSACTION_TYPES = {
  JOURNAL: 'journal',
  OPENING_BALANCE: 'opening_balance',
  CLOSING_ENTRY: 'closing_entry',
  SALE: 'sale',
  SALE_RETURN: 'sale_return',
  PURCHASE: 'purchase',
  PURCHASE_RETURN: 'purchase_return',
  PAYMENT: 'payment',
  RECEIPT: 'receipt',
  EXPENSE: 'expense',
  BANK_DEPOSIT: 'bank_deposit',
  BANK_WITHDRAWAL: 'bank_withdrawal',
  BANK_TRANSFER: 'bank_transfer',
  STOCK_ADJUSTMENT: 'stock_adjustment',
  PRODUCTION: 'production',
  LABOUR: 'labour',
  DEPRECIATION: 'depreciation',
  ACCRUAL: 'accrual',
  PREPAYMENT: 'prepayment'
};

/**
 * Transaction Status
 */
const TRANSACTION_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
  REVERSED: 'reversed',
  VOID: 'void'
};

/**
 * Stock Movement Types
 */
const STOCK_MOVEMENT_TYPES = {
  OPENING_BALANCE: 'opening_balance',
  PURCHASE: 'purchase',
  PURCHASE_RETURN: 'purchase_return',
  SALE: 'sale',
  SALE_RETURN: 'sale_return',
  PRODUCTION_IN: 'production_in',
  PRODUCTION_OUT: 'production_out',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  ADJUSTMENT: 'adjustment',
  DAMAGE: 'damage',
  EXPIRY: 'expiry',
  CONSUMPTION: 'consumption',
  BALL_MILL_IN: 'ball_mill_in',
  BALL_MILL_OUT: 'ball_mill_out'
};

/**
 * Invoice Status
 */
const INVOICE_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  RETURNED: 'returned'
};

/**
 * Payment Status
 */
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

/**
 * Production Status
 */
const PRODUCTION_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Worker Status
 */
const WORKER_STATUS = {
  ACTIVE: 'active',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
  RESIGNED: 'resigned'
};

/**
 * Worker Types
 */
const WORKER_TYPES = {
  PERMANENT: 'permanent',
  CONTRACT: 'contract',
  DAILY_WAGE: 'daily_wage',
  PIECE_RATE: 'piece_rate'
};

/**
 * Activity Types
 */
const ACTIVITY_TYPES = {
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
  CLEANING: 'cleaning',
  TRAINING: 'training',
  OVERTIME: 'overtime',
  IDLE: 'idle',
  OTHER: 'other'
};

/**
 * Payment Methods
 */
const PAYMENT_METHODS = {
  CASH: 'cash',
  CREDIT: 'credit',
  CHEQUE: 'cheque',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card'
};

/**
 * Material Categories
 */
const MATERIAL_CATEGORIES = {
  RAW_MATERIAL: 'raw_material',
  CHEMICAL: 'chemical',
  ADDITIVE: 'additive',
  PACKAGING: 'packaging',
  FUEL: 'fuel',
  OTHER: 'other'
};

/**
 * Product Categories
 */
const PRODUCT_CATEGORIES = {
  TILES: 'tiles',
  SANITARY: 'sanitary',
  TABLEWARE: 'tableware',
  DECORATIVE: 'decorative',
  INDUSTRIAL: 'industrial',
  OTHER: 'other'
};

/**
 * Composition Types
 */
const COMPOSITION_TYPES = {
  BODY: 'body',
  GLAZE: 'glaze',
  ENGOBE: 'engobe',
  SLIP: 'slip',
  OTHER: 'other'
};

/**
 * Unit Types
 */
const UNIT_TYPES = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  LENGTH: 'length',
  AREA: 'area',
  PIECE: 'piece',
  TIME: 'time',
  OTHER: 'other'
};

/**
 * Languages
 */
const LANGUAGES = {
  ENGLISH: 'en',
  URDU: 'ur'
};

/**
 * Themes
 */
const THEMES = {
  DEFAULT: 'default',
  LIGHT: 'light',
  DARK: 'dark',
  GREEN: 'green'
};

/**
 * Permissions
 */
const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',

  // Companies
  COMPANIES_VIEW: 'companies.view',
  COMPANIES_CREATE: 'companies.create',
  COMPANIES_EDIT: 'companies.edit',
  COMPANIES_DELETE: 'companies.delete',

  // Master
  MASTER_VIEW: 'master.view',
  MASTER_CREATE: 'master.create',
  MASTER_EDIT: 'master.edit',
  MASTER_DELETE: 'master.delete',

  // Accounting
  ACCOUNTING_VIEW: 'accounting.view',
  ACCOUNTING_CREATE: 'accounting.create',
  ACCOUNTING_EDIT: 'accounting.edit',
  ACCOUNTING_DELETE: 'accounting.delete',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_DELETE: 'inventory.delete',

  // Workers
  WORKERS_VIEW: 'workers.view',
  WORKERS_CREATE: 'workers.create',
  WORKERS_EDIT: 'workers.edit',
  WORKERS_DELETE: 'workers.delete',

  // Production
  PRODUCTION_VIEW: 'production.view',
  PRODUCTION_CREATE: 'production.create',
  PRODUCTION_EDIT: 'production.edit',
  PRODUCTION_DELETE: 'production.delete',

  // Cash
  CASH_VIEW: 'cash.view',
  CASH_CREATE: 'cash.create',
  CASH_EDIT: 'cash.edit',
  CASH_DELETE: 'cash.delete',

  // Bank
  BANK_VIEW: 'bank.view',
  BANK_CREATE: 'bank.create',
  BANK_EDIT: 'bank.edit',
  BANK_DELETE: 'bank.delete',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Dictionary
  DICTIONARY_VIEW: 'dictionary.view',
  DICTIONARY_EDIT: 'dictionary.edit',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit'
};

/**
 * Default Account Codes
 */
const DEFAULT_ACCOUNTS = {
  // Assets
  CASH_IN_HAND: '111001',
  PETTY_CASH: '111002',
  ACCOUNTS_RECEIVABLE: '112001',
  ADVANCES_TO_SUPPLIERS: '112002',
  RAW_MATERIALS_INVENTORY: '113001',
  WORK_IN_PROCESS: '113002',
  FINISHED_GOODS_INVENTORY: '113003',

  // Liabilities
  ACCOUNTS_PAYABLE: '211001',
  ADVANCES_FROM_CUSTOMERS: '211002',

  // Equity
  OWNER_CAPITAL: '310001',
  DRAWINGS: '310002',

  // Revenue
  SALES_REVENUE: '410001',
  SALES_RETURNS: '410002',
  OTHER_INCOME: '420001',

  // Expenses
  COST_OF_GOODS_SOLD: '510001',
  DIRECT_LABOUR: '521001',
  INDIRECT_LABOUR: '521002',
  RENT_EXPENSE: '530001',
  UTILITIES_EXPENSE: '530002',
  SALARIES_WAGES: '530003',
  ADVERTISING_EXPENSE: '540001',
  COMMISSION_EXPENSE: '540002'
};

module.exports = {
  ROLES,
  COMPANY_STATUS,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  STOCK_MOVEMENT_TYPES,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  PRODUCTION_STATUS,
  WORKER_STATUS,
  WORKER_TYPES,
  ACTIVITY_TYPES,
  PAYMENT_METHODS,
  MATERIAL_CATEGORIES,
  PRODUCT_CATEGORIES,
  COMPOSITION_TYPES,
  UNIT_TYPES,
  LANGUAGES,
  THEMES,
  PERMISSIONS,
  DEFAULT_ACCOUNTS
};
