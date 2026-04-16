import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number with commas
export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format currency
export function formatCurrency(amount: number, currency = 'PKR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date
export function formatDate(date: Date | string, format = 'DD/MM/YYYY'): string {
  const d = new Date(date);
  
  if (format === 'DD/MM/YYYY') {
    return d.toLocaleDateString('en-GB');
  }
  if (format === 'MM/DD/YYYY') {
    return d.toLocaleDateString('en-US');
  }
  if (format === 'YYYY-MM-DD') {
    return d.toISOString().split('T')[0];
  }
  
  return d.toLocaleDateString();
}

// Format date time
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate auto code
export function generateAutoCode(prefix: string, sequence: number, name?: string): string {
  const paddedSequence = sequence.toString().padStart(3, '0');
  return name ? `${prefix}-${paddedSequence}-${name}` : `${prefix}-${paddedSequence}`;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Pakistan format)
export function isValidPhonePK(phone: string): boolean {
  const phoneRegex = /^\+92\d{10}$/;
  return phoneRegex.test(phone);
}

// Validate CNIC
export function isValidCNIC(cnic: string): boolean {
  const cnicRegex = /^\d{5}-\d{7}-\d$/;
  return cnicRegex.test(cnic);
}

// Debounce function
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Deep clone
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Group array by key
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    result[groupKey] = result[groupKey] || [];
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// Calculate sum
export function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

// Calculate average
export function average(array: number[]): number {
  if (array.length === 0) return 0;
  return sum(array) / array.length;
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Get localized name from translation object or string
export function getLocalizedName(name: string | { en?: string; ur?: string } | undefined): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  if (typeof name === 'object') {
    return name.en || name.ur || '';
  }
  return String(name);
}

// Get file extension
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

// Convert bytes to human readable
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Sleep/delay
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse query params
export function parseQueryParams<T extends Record<string, any>>(
  searchParams: URLSearchParams
): T {
  const params: Record<string, any> = {};
  
  searchParams.forEach((value, key) => {
    // Try to parse as number
    if (!isNaN(Number(value)) && value !== '') {
      params[key] = Number(value);
    } else if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else {
      params[key] = value;
    }
  });
  
  return params as T;
}

// Build query string
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}
