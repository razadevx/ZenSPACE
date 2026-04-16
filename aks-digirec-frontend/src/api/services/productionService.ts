import apiClient from '../interceptors/axiosConfig';
import type { 
  ApiResponse, 
  ProductionBatch, 
  CreateProductionBatchRequest,
  ProductionStage 
} from '@/types';

export type { ProductionBatch, ProductionStage };

export interface ProductionStats {
  planned: number;
  in_progress: number;
  completed: number;
  totalBatches: number;
  totalProduced: number;
}

export interface ProductionStageDefinition {
  id: string;
  name: string;
  order: number;
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

  createProductionBatch: async (data: CreateProductionBatchRequest): Promise<ProductionBatch> => {
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

  updateProductionStage: async (
    id: string, 
    stageNumber: number, 
    data: {
      outputQuantity: number;
      rejectedQuantity: number;
      workers: string[];
      notes?: string;
    }
  ): Promise<ProductionBatch> => {
    const response = await apiClient.put<ApiResponse<ProductionBatch>>(
      `/production/batches/${id}/stage/${stageNumber}`,
      data
    );
    return response.data.data!;
  },

  completeProductionBatch: async (
    id: string, 
    data: {
      actualOutput: {
        quantity: number;
        approved: number;
        rejected: number;
      };
      quality?: {
        grade: 'A' | 'B' | 'C' | 'Reject';
        remarks?: string;
      };
    }
  ): Promise<ProductionBatch> => {
    const response = await apiClient.put<ApiResponse<ProductionBatch>>(
      `/production/batches/${id}/complete`,
      data
    );
    return response.data.data!;
  },

  // Get production pipeline stages
  getProductionStages: async (): Promise<ProductionStageDefinition[]> => {
    const response = await apiClient.get<ApiResponse<ProductionStageDefinition[]>>('/production/stages');
    return response.data.data || [];
  },

  // Get production statistics
  getProductionStats: async (params?: { from?: string; to?: string }): Promise<ProductionStats> => {
    const response = await apiClient.get<ApiResponse<ProductionStats>>('/production/stats', { params });
    return response.data.data || {
      planned: 0,
      in_progress: 0,
      completed: 0,
      totalBatches: 0,
      totalProduced: 0
    };
  }
};
