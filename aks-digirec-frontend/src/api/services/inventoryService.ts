import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface StockLedger {
  _id: string;
  itemType: string;
  itemId: string;
  movementType: 'in' | 'out';
  quantity: number;
  unit: string;
  movementDate: string;
  reference: string;
  companyId: string;
}

export interface StockBalance {
  itemType: string;
  itemId: string;
  currentStock: number;
  unit: string;
  lastUpdated: string;
}

export interface ProcessedStock {
  _id: string;
  name: string;
  code: string;
  type: string;
  currentStock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  isActive: boolean;
  companyId: string;
}

export const inventoryApi = {
  // Stock Ledger
  getStockLedger: async (params?: {
    itemType?: string;
    itemId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: StockLedger[]; pagination: any }> => {
    const response = await apiClient.get<any>('/inventory/stock-ledger', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },
  
  // Stock Balance
  getStockBalance: async (itemType: string, itemId: string): Promise<StockBalance> => {
    const response = await apiClient.get<ApiResponse<StockBalance>>(`/inventory/stock-balance/${itemType}/${itemId}`);
    return response.data.data!;
  },
  
  // Processed Stock
  getProcessedStock: async (type?: string): Promise<ProcessedStock[]> => {
    const response = await apiClient.get<ApiResponse<ProcessedStock[]>>('/inventory/processed-stock', {
      params: type ? { type } : undefined
    });
    return response.data.data!;
  },
  
  createProcessedStock: async (data: Partial<ProcessedStock>): Promise<ProcessedStock> => {
    const response = await apiClient.post<ApiResponse<ProcessedStock>>('/inventory/processed-stock', data);
    return response.data.data!;
  },
};
