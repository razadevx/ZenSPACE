import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface AccountGroup {
  _id: string;
  name: string;
  code: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentGroup?: string;
  description?: string;
  isActive: boolean;
  company: string;
}

export interface LedgerAccount {
  _id: string;
  name: string;
  code: string;
  accountGroup: string;
  openingBalance: number;
  currentBalance: number;
  description?: string;
  isActive: boolean;
  company: string;
}

export interface Transaction {
  _id: string;
  date: string;
  description: string;
  entries: {
    account: string;
    debit: number;
    credit: number;
  }[];
  status: 'draft' | 'posted' | 'reversed';
  totalAmount: number;
  company: string;
  createdBy: string;
  createdAt: string;
}

export interface FiscalYear {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  company: string;
}

export const accountingApi = {
  // Account Groups
  getAccountGroups: async (): Promise<AccountGroup[]> => {
    const response = await apiClient.get<ApiResponse<AccountGroup[]>>('/accounting/account-groups');
    return response.data.data!;
  },
  
  createAccountGroup: async (data: Partial<AccountGroup>): Promise<AccountGroup> => {
    const response = await apiClient.post<ApiResponse<AccountGroup>>('/accounting/account-groups', data);
    return response.data.data!;
  },
  
  updateAccountGroup: async (id: string, data: Partial<AccountGroup>): Promise<AccountGroup> => {
    const response = await apiClient.put<ApiResponse<AccountGroup>>(`/accounting/account-groups/${id}`, data);
    return response.data.data!;
  },
  
  // Ledger Accounts
  getLedgerAccounts: async (): Promise<LedgerAccount[]> => {
    const response = await apiClient.get<ApiResponse<LedgerAccount[]>>('/accounting/ledger-accounts');
    return response.data.data!;
  },
  
  createLedgerAccount: async (data: Partial<LedgerAccount>): Promise<LedgerAccount> => {
    const response = await apiClient.post<ApiResponse<LedgerAccount>>('/accounting/ledger-accounts', data);
    return response.data.data!;
  },
  
  getLedgerAccount: async (id: string): Promise<LedgerAccount> => {
    const response = await apiClient.get<ApiResponse<LedgerAccount>>(`/accounting/ledger-accounts/${id}`);
    return response.data.data!;
  },
  
  getAccountLedger: async (id: string): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/accounting/ledger-accounts/${id}/entries`);
    return response.data.data!;
  },
  
  updateLedgerAccount: async (id: string, data: Partial<LedgerAccount>): Promise<LedgerAccount> => {
    const response = await apiClient.put<ApiResponse<LedgerAccount>>(`/accounting/ledger-accounts/${id}`, data);
    return response.data.data!;
  },
  
  deleteLedgerAccount: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounting/ledger-accounts/${id}`);
  },
  
  // Chart of Accounts
  getChartOfAccounts: async (): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/accounting/chart-of-accounts');
    return response.data.data!;
  },
  
  // Fiscal Years
  getFiscalYears: async (): Promise<FiscalYear[]> => {
    const response = await apiClient.get<ApiResponse<FiscalYear[]>>('/accounting/fiscal-years');
    return response.data.data!;
  },
  
  getCurrentFiscalYear: async (): Promise<FiscalYear> => {
    const response = await apiClient.get<ApiResponse<FiscalYear>>('/accounting/fiscal-years/current');
    return response.data.data!;
  },
  
  createFiscalYear: async (data: Partial<FiscalYear>): Promise<FiscalYear> => {
    const response = await apiClient.post<ApiResponse<FiscalYear>>('/accounting/fiscal-years', data);
    return response.data.data!;
  },
  
  // Transactions
  getTransactions: async (params?: any): Promise<Transaction[]> => {
    const response = await apiClient.get<ApiResponse<Transaction[]>>('/accounting/transactions', { params });
    return response.data.data!;
  },
  
  createTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    const response = await apiClient.post<ApiResponse<Transaction>>('/accounting/transactions', data);
    return response.data.data!;
  },
  
  getTransaction: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get<ApiResponse<Transaction>>(`/accounting/transactions/${id}`);
    return response.data.data!;
  },
  
  postTransaction: async (id: string): Promise<Transaction> => {
    const response = await apiClient.post<ApiResponse<Transaction>>(`/accounting/transactions/${id}/post`);
    return response.data.data!;
  },
  
  reverseTransaction: async (id: string, reason?: string): Promise<Transaction> => {
    const response = await apiClient.post<ApiResponse<Transaction>>(`/accounting/transactions/${id}/reverse`, { reason });
    return response.data.data!;
  },
  
  // Trial Balance
  getTrialBalance: async (params?: { date?: string }): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/accounting/trial-balance', { params });
    return response.data.data!;
  },
};
