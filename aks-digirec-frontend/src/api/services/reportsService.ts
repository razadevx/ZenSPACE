import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface IncomeExpenditureSummary {
  income: number;
  expenses: number;
  profit: number;
}

export const reportsApi = {
  getIncomeExpenditure: async (): Promise<IncomeExpenditureSummary> => {
    const response = await apiClient.get<ApiResponse<IncomeExpenditureSummary>>('/reports/income-expenditure');
    const payload = (response.data as any).data ?? response.data;
    return {
      income: payload.income ?? 0,
      expenses: payload.expenses ?? 0,
      profit: payload.profit ?? 0,
    };
  },
};

