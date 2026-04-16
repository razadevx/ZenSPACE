import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface Composition {
  _id: string;
  code: string;
  name: {
    en: string;
    ur?: string;
  } | string;
  description?: {
    en?: string;
    ur?: string;
  } | string;
  type: 'body' | 'glaze' | 'engobe' | 'slip' | 'other';
  items: CompositionItem[];
  outputUnit?: string | { _id: string; symbol: string; name: string };
  totalQuantity?: number;
  processingTime?: {
    hours: number;
    minutes: number;
  };
  cost?: {
    materialCost: number;
    wastageCost: number;
    totalCost: number;
    costPerUnit: number;
  };
  status: 'draft' | 'active' | 'inactive';
  isActive: boolean;
  companyId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CompositionItem {
  material: string;
  quantity: number;
  unit: string;
}

export interface BallMill {
  _id: string;
  name: {
    en: string;
    ur?: string;
  } | string;
  code: string;
  description?: {
    en?: string;
    ur?: string;
  } | string;
  specifications?: {
    capacity: number;
    volume?: number;
    motorPower?: string;
    liningMaterial?: string;
    ballCharge?: number;
    type?: 'clay' | 'glaze' | 'color';
  };
  operationalStatus?: 'operational' | 'maintenance' | 'repair' | 'retired';
  statistics?: {
    totalBatches: number;
    totalOutput: number;
    lastMaintenance?: string;
    nextMaintenance?: string;
  };
  currentBatch?: string | { _id: string; batchNumber: string; status: string };
  isActive: boolean;
  companyId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BallMillBatch {
  _id: string;
  batchNumber: string;
  ballMill: string | { _id: string; name: { en: string; ur?: string } | string; code: string; specifications?: any };
  composition: string | { _id: string; name: { en: string; ur?: string } | string; code: string; type: string };
  batchDate: string;
  inputs?: any[];
  totalInput?: {
    quantity: number;
    cost: number;
  };
  output?: {
    quantity: number;
    unit?: string;
    processedStock?: string;
    tankNumber?: string;
  };
  processing: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    waterAdded?: number;
    grindingMedia?: string;
    operator?: string;
  };
  qualityTest?: {
    testedBy?: string;
    testedAt?: string;
    density?: number;
    viscosity?: number;
    ph?: number;
    residue?: number;
    moisture?: number;
    status?: 'pass' | 'fail' | 'pending';
    remarks?: string;
  };
  cost?: {
    materialCost: number;
    labourCost: number;
    overheadCost: number;
    totalCost: number;
    costPerUnit: number;
  };
  wastage?: {
    quantity: number;
    percentage: number;
    reason?: string;
  };
  status: 'preparing' | 'running' | 'completed' | 'quality_check' | 'approved' | 'rejected';
  notes?: string;
  companyId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
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
  
  completeBallMillBatch: async (id: string, data?: {
    output?: {
      quantity: number;
      tankNumber?: string;
    };
    qualityTest?: {
      density?: number;
      viscosity?: number;
      ph?: number;
      residue?: number;
      moisture?: number;
      remarks?: string;
    };
  }): Promise<BallMillBatch> => {
    const response = await apiClient.put<ApiResponse<BallMillBatch>>(`/composition/batches/${id}/complete`, data || {});
    return response.data.data!;
  },
};
