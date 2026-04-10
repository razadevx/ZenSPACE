/**
 * Format number with specified decimal places
 */
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0.00';
  return parseFloat(num).toFixed(decimals);
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'PKR', locale = 'en-PK') => {
  if (amount === null || amount === undefined) amount = 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format date
 */
const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year);
};

/**
 * Generate unique code
 */
const generateCode = (prefix, count, padLength = 4) => {
  return `${prefix}${String(count + 1).padStart(padLength, '0')}`;
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
  if (!total) return 0;
  return parseFloat(((value / total) * 100).toFixed(2));
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Paginate array
 */
const paginate = (array, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: array.slice(start, end),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: array.length,
      pages: Math.ceil(array.length / limit)
    }
  };
};

/**
 * Sanitize string for search
 */
const sanitizeSearch = (str) => {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Get start and end of day
 */
const getDayBounds = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Get start and end of month
 */
const getMonthBounds = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Get start and end of year
 */
const getYearBounds = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Add days to date
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Difference in days
 */
const diffInDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = d2 - d1;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is overdue
 */
const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date() > new Date(dueDate);
};

/**
 * Group array by key
 */
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * Sum array by key
 */
const sumBy = (array, key) => {
  return array.reduce((sum, item) => sum + (item[key] || 0), 0);
};

/**
 * Average array by key
 */
const averageBy = (array, key) => {
  if (!array.length) return 0;
  return sumBy(array, key) / array.length;
};

/**
 * Remove null/undefined from object
 */
const cleanObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Convert to boolean
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
};

/**
 * Generate random string
 */
const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Slugify string
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = {
  formatNumber,
  formatCurrency,
  formatDate,
  generateCode,
  calculatePercentage,
  deepClone,
  paginate,
  sanitizeSearch,
  getDayBounds,
  getMonthBounds,
  getYearBounds,
  addDays,
  diffInDays,
  isOverdue,
  groupBy,
  sumBy,
  averageBy,
  cleanObject,
  toBoolean,
  generateRandomString,
  slugify
};
