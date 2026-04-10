import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CashSummary {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  netCash: number;
  salesCount: number;
  purchasesCount: number;
  expensesCount: number;
  date: string;
}

export interface SaleInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer?: { _id: string; name: string; businessName?: string };
  summary: { grandTotal: number; subtotal: number };
  payment: { method: string; status: string; paidAmount: number; balanceDue: number };
  status: string;
  returnInfo?: { isReturned: boolean; returnDate?: string; returnAmount?: number; reason?: string };
}

export interface PurchaseInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplier?: { _id: string; businessName?: string };
  summary: { grandTotal: number; subtotal: number };
  payment: { method: string; status: string; paidAmount: number; balanceDue: number };
  status: string;
  returnInfo?: { isReturned: boolean; returnDate?: string; returnAmount?: number; reason?: string };
}

export interface CashTransaction {
  _id?: string;
  transactionNumber?: string;
  transactionDate?: string;
  type: 'receipt' | 'payment' | 'expense' | 'income' | 'transfer_in' | 'transfer_out' | 'adjustment';
  category?: string;
  party?: { type?: string; name?: string };
  amount: number;
  description?: string;
  cashAccount?: { _id: string; name: string };
  status: string;
  currency?: string;
  // Legacy shape aliases used by the page
  documentNo?: string;
  date?: string;
  paymentMode?: string;
}

export interface CreateTransactionPayload {
  type: string;
  category: string;
  amount: number;
  transactionDate?: string;
  description?: string;
  notes?: string;
  cashAccount?: string;
  party?: { type?: string; name?: string };
}

export interface ListParams {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  status?: string;
}

// ─── API helper ───────────────────────────────────────────────────────────────

const BASE = '/cash-register';

function extractList<T>(response: any): T[] {
  const payload = response.data?.data ?? response.data;
  return Array.isArray(payload) ? payload : [];
}

// ─── cashApi ──────────────────────────────────────────────────────────────────

export const cashApi = {
  // Summary
  getDailySummary: async (date?: string): Promise<CashSummary> => {
    const params = date ? { date } : {};
    const response = await apiClient.get<ApiResponse<CashSummary>>(`${BASE}/daily-summary`, { params });
    const payload = (response.data as any).data ?? response.data;
    return {
      totalSales: payload.totalSales ?? 0,
      totalPurchases: payload.totalPurchases ?? 0,
      totalExpenses: payload.totalExpenses ?? 0,
      netCash: payload.netCash ?? 0,
      salesCount: payload.salesCount ?? 0,
      purchasesCount: payload.purchasesCount ?? 0,
      expensesCount: payload.expensesCount ?? 0,
      date: payload.date ?? '',
    };
  },

  // Sales
  getSales: async (params?: ListParams): Promise<SaleInvoice[]> => {
    const response = await apiClient.get(`${BASE}/sales`, { params });
    return extractList<SaleInvoice>(response);
  },

  createSale: async (data: any): Promise<SaleInvoice> => {
    const response = await apiClient.post(`${BASE}/sales`, data);
    return (response.data as any).data;
  },

  // Purchases
  getPurchases: async (params?: ListParams): Promise<PurchaseInvoice[]> => {
    const response = await apiClient.get(`${BASE}/purchases`, { params });
    return extractList<PurchaseInvoice>(response);
  },

  createPurchase: async (data: any): Promise<PurchaseInvoice> => {
    const response = await apiClient.post(`${BASE}/purchases`, data);
    return (response.data as any).data;
  },

  // Returns
  getSalesReturns: async (params?: ListParams): Promise<SaleInvoice[]> => {
    const response = await apiClient.get(`${BASE}/sales-returns`, { params });
    return extractList<SaleInvoice>(response);
  },

  getPurchaseReturns: async (params?: ListParams): Promise<PurchaseInvoice[]> => {
    const response = await apiClient.get(`${BASE}/purchase-returns`, { params });
    return extractList<PurchaseInvoice>(response);
  },

  // Cash Transactions
  getTransactions: async (params?: ListParams): Promise<CashTransaction[]> => {
    const response = await apiClient.get(`${BASE}/transactions`, { params });
    return extractList<CashTransaction>(response);
  },

  createTransaction: async (data: CreateTransactionPayload): Promise<CashTransaction> => {
    const response = await apiClient.post(`${BASE}/transactions`, data);
    return (response.data as any).data;
  },
};
