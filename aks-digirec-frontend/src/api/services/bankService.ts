import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface BankAccount {
  _id: string;
  code: string;
  bankName: string;
  branchName?: string;
  branchCode?: string;
  accountNumber: string;
  accountTitle: string;
  accountType: 'current' | 'savings' | 'fixed_deposit' | 'overdraft' | 'loan';
  iban?: string;
  swiftCode?: string;
  currency: string;
  openingBalance: {
    amount: number;
    date?: string;
  };
  currentBalance: {
    amount: number;
    lastUpdated: string;
  };
  limits?: {
    overdraft: number;
    minimumBalance: number;
  };
  contact?: {
    phone?: string;
    email?: string;
    relationshipManager?: string;
  };
  ledgerAccount?: string;
  isActive: boolean;
  isDefault: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  _id: string;
  transactionNumber: string;
  bankAccount: string | BankAccount;
  transactionDate: string;
  valueDate?: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'cheque_deposit' | 'cheque_clearance' | 'bank_charges' | 'interest';
  category?: string;
  party?: {
    name?: string;
    type?: 'customer' | 'supplier' | 'worker' | 'bank' | 'other';
    id?: string;
  };
  amount: number;
  currency: string;
  cheque?: {
    number?: string;
    date?: string;
    bank?: string;
    status?: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  };
  reference?: string;
  description?: string;
  notes?: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  clearedAt?: string;
  runningBalance?: number;
  ledgerTransactionId?: string;
  reconciliation?: {
    isReconciled: boolean;
    reconciledAt?: string;
    reconciledBy?: string;
    statementDate?: string;
  };
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cheque {
  _id: string;
  transactionNumber: string;
  bankAccount: string | BankAccount;
  type: 'cheque_deposit' | 'cheque_clearance';
  amount: number;
  currency: string;
  cheque: {
    number: string;
    date: string;
    bank?: string;
    status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  };
  party?: {
    name?: string;
    type?: string;
    id?: string;
  };
  reference?: string;
  description?: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  clearedAt?: string;
  companyId: string;
  createdAt: string;
}

export interface BankSummary {
  totalBalance: number;
  accountCount: number;
  pendingCheques: number;
  clearedCheques: number;
  accounts: Array<{
    _id: string;
    bankName: string;
    accountNumber: string;
    accountType: string;
    balance: number;
  }>;
}

export const bankApi = {
  // Bank Accounts
  getBankAccounts: async (): Promise<BankAccount[]> => {
    const response = await apiClient.get<ApiResponse<BankAccount[]>>('/bank/accounts');
    return response.data.data!;
  },

  createBankAccount: async (data: Partial<BankAccount>): Promise<BankAccount> => {
    const response = await apiClient.post<ApiResponse<BankAccount>>('/bank/accounts', data);
    return response.data.data!;
  },

  getBankAccount: async (id: string): Promise<BankAccount> => {
    const response = await apiClient.get<ApiResponse<BankAccount>>(`/bank/accounts/${id}`);
    return response.data.data!;
  },

  updateBankAccount: async (id: string, data: Partial<BankAccount>): Promise<BankAccount> => {
    const response = await apiClient.put<ApiResponse<BankAccount>>(`/bank/accounts/${id}`, data);
    return response.data.data!;
  },

  deleteBankAccount: async (id: string): Promise<BankAccount> => {
    const response = await apiClient.delete<ApiResponse<BankAccount>>(`/bank/accounts/${id}`);
    return response.data.data!;
  },

  // Bank Transactions
  getBankTransactions: async (params?: {
    bankAccount?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: BankTransaction[]; pagination: any }> => {
    const response = await apiClient.get<any>('/bank/transactions', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },

  createBankTransaction: async (data: Partial<BankTransaction>): Promise<BankTransaction> => {
    const response = await apiClient.post<ApiResponse<BankTransaction>>('/bank/transactions', data);
    return response.data.data!;
  },

  updateBankTransaction: async (id: string, data: Partial<BankTransaction>): Promise<BankTransaction> => {
    const response = await apiClient.put<ApiResponse<BankTransaction>>(`/bank/transactions/${id}`, data);
    return response.data.data!;
  },

  deleteBankTransaction: async (id: string): Promise<BankTransaction> => {
    const response = await apiClient.delete<ApiResponse<BankTransaction>>(`/bank/transactions/${id}`);
    return response.data.data!;
  },

  clearBankTransaction: async (id: string): Promise<BankTransaction> => {
    const response = await apiClient.put<ApiResponse<BankTransaction>>(`/bank/transactions/${id}/clear`);
    return response.data.data!;
  },

  // Cheques
  getCheques: async (params?: {
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Cheque[]; pagination: any }> => {
    const response = await apiClient.get<any>('/bank/cheques', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },

  createCheque: async (data: Partial<Cheque>): Promise<Cheque> => {
    const response = await apiClient.post<ApiResponse<Cheque>>('/bank/cheques', data);
    return response.data.data!;
  },

  updateChequeStatus: async (id: string, status: 'cleared' | 'bounced' | 'cancelled'): Promise<Cheque> => {
    const response = await apiClient.put<ApiResponse<Cheque>>(`/bank/cheques/${id}/status`, { status });
    return response.data.data!;
  },

  // Summary
  getBankSummary: async (): Promise<BankSummary> => {
    const response = await apiClient.get<ApiResponse<BankSummary>>('/bank/summary');
    return response.data.data!;
  }
};
