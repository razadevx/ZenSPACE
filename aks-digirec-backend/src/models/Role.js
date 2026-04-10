const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    enum: ['super_admin', 'admin', 'manager', 'accountant', 'operator', 'viewer']
  },
  displayName: {
    en: { type: String, required: true },
    ur: { type: String, required: true }
  },
  description: {
    en: String,
    ur: String
  },
  permissions: [{
    type: String,
    enum: [
      // User Management
      'users.view', 'users.create', 'users.edit', 'users.delete',
      // Company Management
      'companies.view', 'companies.create', 'companies.edit', 'companies.delete',
      // Master Data
      'master.view', 'master.create', 'master.edit', 'master.delete',
      // Accounting
      'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete',
      // Inventory
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
      // Workers
      'workers.view', 'workers.create', 'workers.edit', 'workers.delete',
      // Production
      'production.view', 'production.create', 'production.edit', 'production.delete',
      // Cash Register
      'cash.view', 'cash.create', 'cash.edit', 'cash.delete',
      // Bank
      'bank.view', 'bank.create', 'bank.edit', 'bank.delete',
      // Reports
      'reports.view', 'reports.export',
      // Dictionary
      'dictionary.view', 'dictionary.edit',
      // Settings
      'settings.view', 'settings.edit'
    ]
  }],
  isSystem: {
    type: Boolean,
    default: false
  },
  level: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Static method to get default roles
roleSchema.statics.getDefaultRoles = function() {
  return [
    {
      name: 'super_admin',
      displayName: { en: 'Super Admin', ur: 'سپر ایڈمن' },
      description: { en: 'Full system access', ur: 'مکمل سسٹم رسائی' },
      permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'companies.view', 'companies.create', 'companies.edit', 'companies.delete', 'master.view', 'master.create', 'master.edit', 'master.delete', 'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'workers.view', 'workers.create', 'workers.edit', 'workers.delete', 'production.view', 'production.create', 'production.edit', 'production.delete', 'cash.view', 'cash.create', 'cash.edit', 'cash.delete', 'bank.view', 'bank.create', 'bank.edit', 'bank.delete', 'reports.view', 'reports.export', 'dictionary.view', 'dictionary.edit', 'settings.view', 'settings.edit'],
      isSystem: true,
      level: 100
    },
    {
      name: 'admin',
      displayName: { en: 'Admin', ur: 'ایڈمن' },
      description: { en: 'Company administrator', ur: 'کمپنی منتظم' },
      permissions: ['users.view', 'users.create', 'users.edit', 'master.view', 'master.create', 'master.edit', 'master.delete', 'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'workers.view', 'workers.create', 'workers.edit', 'workers.delete', 'production.view', 'production.create', 'production.edit', 'production.delete', 'cash.view', 'cash.create', 'cash.edit', 'cash.delete', 'bank.view', 'bank.create', 'bank.edit', 'bank.delete', 'reports.view', 'reports.export', 'dictionary.view', 'settings.view', 'settings.edit'],
      isSystem: true,
      level: 90
    },
    {
      name: 'manager',
      displayName: { en: 'Manager', ur: 'مینیجر' },
      description: { en: 'Department manager', ur: 'شعبہ مینیجر' },
      permissions: ['master.view', 'master.create', 'master.edit', 'accounting.view', 'accounting.create', 'inventory.view', 'inventory.create', 'inventory.edit', 'workers.view', 'workers.create', 'workers.edit', 'production.view', 'production.create', 'production.edit', 'cash.view', 'cash.create', 'bank.view', 'reports.view'],
      isSystem: true,
      level: 70
    },
    {
      name: 'accountant',
      displayName: { en: 'Accountant', ur: 'اکاؤنٹنٹ' },
      description: { en: 'Accounting staff', ur: 'اکاؤنٹنگ اسٹاف' },
      permissions: ['accounting.view', 'accounting.create', 'accounting.edit', 'cash.view', 'cash.create', 'cash.edit', 'bank.view', 'bank.create', 'bank.edit', 'reports.view', 'reports.export'],
      isSystem: true,
      level: 50
    },
    {
      name: 'operator',
      displayName: { en: 'Operator', ur: 'آپریٹر' },
      description: { en: 'System operator', ur: 'سسٹم آپریٹر' },
      permissions: ['master.view', 'inventory.view', 'inventory.create', 'workers.view', 'workers.create', 'production.view', 'production.create', 'cash.view', 'cash.create'],
      isSystem: true,
      level: 30
    },
    {
      name: 'viewer',
      displayName: { en: 'Viewer', ur: 'ناظر' },
      description: { en: 'Read-only access', ur: 'صرف پڑھنے کی رسائی' },
      permissions: ['master.view', 'accounting.view', 'inventory.view', 'workers.view', 'production.view', 'cash.view', 'bank.view', 'reports.view'],
      isSystem: true,
      level: 10
    }
  ];
};

module.exports = mongoose.model('Role', roleSchema);
