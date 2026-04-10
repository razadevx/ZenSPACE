import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface Composition {
  _id: string;
  name: string;
  type: 'clay' | 'glaze' | 'color';
  items: CompositionItem[];
  outputUnit: string;
  outputQuantity: number;
  yieldPercent: number;
  expectedLoss: number;
  isActive: boolean;
  companyId: string;
  createdBy: string;
  createdAt: string;
}

export interface CompositionItem {
  material: string;
  quantity: number;
  unit: string;
}

export interface BallMill {
  _id: string;
  name: string;
  code: string;
  type: 'clay' | 'glaze' | 'color';
  capacity: number;
  unit: string;
  description?: string;
  isActive: boolean;
  companyId: string;
  createdBy: string;
  createdAt: string;
}

export interface BallMillBatch {
  _id: string;
  ballMill: string;
  composition: string;
  batchDate: string;
  inputQuantity: number;
  outputQuantity?: number;
  status: 'running' | 'completed';
  processing: {
    startTime: string;
    endTime?: string;
  };
  companyId: string;
  createdBy: string;
  createdAt: string;
}

export const compositionApi = {
  // Compositions
  getCompositions: async (type?: string): Promise<Composition[]> => {
    const response = await apiClient.get<ApiResponse<Composition[]>>('/composition/compositions', {
      params: type ? { type } : undefined
    });
    return response.data.data!;
  },
  
  createComposition: async (data: Partial<Composition>): Promise<Composition> => {
    const response = await apiClient.post<ApiResponse<Composition>>('/composition/compositions', data);
    return response.data.data!;
  },
  
  getComposition: async (id: string): Promise<Composition> => {
    const response = await apiClient.get<ApiResponse<Composition>>(`/composition/compositions/${id}`);
    return response.data.data!;
  },
  
  // Ball Mills
  getBallMills: async (): Promise<BallMill[]> => {
    const response = await apiClient.get<ApiResponse<BallMill[]>>('/composition/ball-mills');
    return response.data.data!;
  },
  
  createBallMill: async (data: Partial<BallMill>): Promise<BallMill> => {
    const response = await apiClient.post<ApiResponse<BallMill>>('/composition/ball-mills', data);
    return response.data.data!;
  },
  
  // Ball Mill Batches
  getBallMillBatches: async (params?: {
    ballMill?: string;
    status?: string;
  }): Promise<BallMillBatch[]> => {
    const response = await apiClient.get<ApiResponse<BallMillBatch[]>>('/composition/batches', { params });
    return response.data.data!;
  },
  
  createBallMillBatch: async (data: Partial<BallMillBatch>): Promise<BallMillBatch> => {
    const response = await apiClient.post<ApiResponse<BallMillBatch>>('/composition/batches', data);
    return response.data.data!;
  },
  
  completeBallMillBatch: async (id: string): Promise<BallMillBatch> => {
    const response = await apiClient.put<ApiResponse<BallMillBatch>>(`/composition/batches/${id}/complete`);
    return response.data.data!;
  },
};
