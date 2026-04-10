import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface BankAccount {
  _id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  isActive: boolean;
  companyId: string;
}

export interface BankTransaction {
  _id: string;
  bankAccount: string;
  transactionDate: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'transfer';
  status: 'pending' | 'cleared';
  reference?: string;
  companyId: string;
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
  
  clearBankTransaction: async (id: string): Promise<BankTransaction> => {
    const response = await apiClient.put<ApiResponse<BankTransaction>>(`/bank/transactions/${id}/clear`);
    return response.data.data!;
  },
};
