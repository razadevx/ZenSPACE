import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface ProductionBatch {
  _id: string;
  batchNo: string;
  finishedGood: string;
  productionDate: string;
  quantity: number;
  stages: ProductionStage[];
  status: 'planned' | 'in_progress' | 'completed';
  totalLoss: number;
  actualOutput?: number;
  companyId: string;
  createdBy: string;
  createdAt: string;
}

export interface ProductionStage {
  stage: string;
  stageNumber: number;
  status: 'pending' | 'in_progress' | 'completed';
  inputQuantity: number;
  outputQuantity?: number;
  rejectedQuantity?: number;
  workers: string[];
  startTime?: string;
  endTime?: string;
}

export const productionApi = {
  // Production Batches
  getProductionBatches: async (params?: {
    finishedGood?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ProductionBatch[]; pagination: any }> => {
    const response = await apiClient.get<any>('/production/batches', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },
  
  createProductionBatch: async (data: Partial<ProductionBatch>): Promise<ProductionBatch> => {
    const response = await apiClient.post<ApiResponse<ProductionBatch>>('/production/batches', data);
    return response.data.data!;
  },
  
  getProductionBatch: async (id: string): Promise<ProductionBatch> => {
    const response = await apiClient.get<ApiResponse<ProductionBatch>>(`/production/batches/${id}`);
    return response.data.data!;
  },
  
  startProductionBatch: async (id: string): Promise<ProductionBatch> => {
    const response = await apiClient.put<ApiResponse<ProductionBatch>>(`/production/batches/${id}/start`);
    return response.data.data!;
  },
  
  updateProductionStage: async (id: string, stageNumber: number, data: {
    outputQuantity: number;
    rejectedQuantity: number;
    workers: string[];
  }): Promise<ProductionBatch> => {
    const response = await apiClient.put<ApiResponse<ProductionBatch>>(
      `/production/batches/${id}/stage/${stageNumber}`, 
      data
    );
    return response.data.data!;
  },
  
  completeProductionBatch: async (id: string, actualOutput: number): Promise<ProductionBatch> => {
    const response = await apiClient.put<ApiResponse<ProductionBatch>>(
      `/production/batches/${id}/complete`, 
      { actualOutput }
    );
    return response.data.data!;
  },
};
