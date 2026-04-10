import apiClient from '../interceptors/axiosConfig';
import type { 
  Section, RawMaterial, Supplier, Worker, Customer, FinishedGood,
  ApiResponse 
} from '@/types';
import { adaptSection, adaptRawMaterial, adaptSupplier, adaptWorker, adaptCustomer, adaptFinishedGood } from '../adapters/masterAdapters';

// Generic CRUD operations
const createCrudApi = <T extends { _id: string }>(endpoint: string, adapter?: (item: any) => T) => ({
  getAll: async (params?: Record<string, any>): Promise<T[]> => {
    const response = await apiClient.get<ApiResponse<T[]>>(endpoint, { params });
    const data = response.data.data || [];
    return adapter ? data.map(adapter) : data;
  },
  
  getById: async (id: string): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(`${endpoint}/${id}`);
    const data = response.data.data!;
    return adapter ? adapter(data) : data;
  },
  
  create: async (data: Record<string, any>): Promise<T> => {
    const response = await apiClient.post<ApiResponse<T>>(endpoint, data);
    const result = response.data.data!;
    return adapter ? adapter(result) : result;
  },
  
  update: async (id: string, data: Record<string, any>): Promise<T> => {
    const response = await apiClient.put<ApiResponse<T>>(`${endpoint}/${id}`, data);
    const result = response.data.data!;
    return adapter ? adapter(result) : result;
  },
  
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${endpoint}/${id}`);
  },
  
  search: async (query: string): Promise<T[]> => {
    const response = await apiClient.get<ApiResponse<T[]>>(`${endpoint}/search`, { 
      params: { q: query } 
    });
    return response.data.data || [];
  },
});

// Section API
export const sectionApi = {
  ...createCrudApi<Section>('/master/sections', adaptSection),
  getByGroup: async (group: string): Promise<Section[]> => {
    const response = await apiClient.get<ApiResponse<Section[]>>('/master/sections/by-group', {
      params: { group },
    });
    return response.data.data || [];
  },
};

// Raw Material API
export const rawMaterialApi = {
  ...createCrudApi<RawMaterial>('/master/raw-materials', adaptRawMaterial),
  getByType: async (type: string): Promise<RawMaterial[]> => {
    const response = await apiClient.get<ApiResponse<RawMaterial[]>>('/master/raw-materials/by-type', {
      params: { type },
    });
    return response.data.data || [];
  },
  getLowStock: async (): Promise<RawMaterial[]> => {
    const response = await apiClient.get<ApiResponse<RawMaterial[]>>('/master/raw-materials/low-stock');
    return response.data.data || [];
  },
  updateStock: async (id: string, quantity: number, type: 'in' | 'out'): Promise<RawMaterial> => {
    const response = await apiClient.post<ApiResponse<RawMaterial>>(`/master/raw-materials/${id}/stock`, {
      quantity,
      type,
    });
    return response.data.data!;
  },
};

// Supplier API
export const supplierApi = {
  ...createCrudApi<Supplier>('/master/suppliers', adaptSupplier),
  getByType: async (type: string): Promise<Supplier[]> => {
    const response = await apiClient.get<ApiResponse<Supplier[]>>('/master/suppliers/by-type', {
      params: { type },
    });
    return response.data.data || [];
  },
  getLedger: async (id: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/master/suppliers/${id}/ledger`);
    return response.data.data;
  },
};

// Worker API
export const workerApi = {
  ...createCrudApi<Worker>('/master/workers', adaptWorker),
  getBySection: async (sectionGroup: string): Promise<Worker[]> => {
    const response = await apiClient.get<ApiResponse<Worker[]>>('/master/workers/by-section', {
      params: { sectionGroup },
    });
    return response.data.data || [];
  },
  getActive: async (): Promise<Worker[]> => {
    const response = await apiClient.get<ApiResponse<Worker[]>>('/master/workers/active');
    return response.data.data || [];
  },
  updateAdvance: async (id: string, amount: number): Promise<Worker> => {
    const response = await apiClient.post<ApiResponse<Worker>>(`/master/workers/${id}/advance`, {
      amount,
    });
    return response.data.data!;
  },
};

// Customer API
export const customerApi = {
  ...createCrudApi<Customer>('/master/customers', adaptCustomer),
  getByType: async (type: string): Promise<Customer[]> => {
    const response = await apiClient.get<ApiResponse<Customer[]>>('/master/customers/by-type', {
      params: { type },
    });
    return response.data.data || [];
  },
  getLedger: async (id: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/master/customers/${id}/ledger`);
    return response.data.data;
  },
  checkCreditLimit: async (id: string, amount: number): Promise<{ allowed: boolean; remaining: number }> => {
    const response = await apiClient.get<ApiResponse<{ allowed: boolean; remaining: number }>>(
      `/master/customers/${id}/credit-check`,
      { params: { amount } }
    );
    return response.data.data!;
  },
};

// Finished Good API
export const finishedGoodApi = {
  ...createCrudApi<FinishedGood>('/master/finished-goods', adaptFinishedGood),
  getByCategory: async (category: string): Promise<FinishedGood[]> => {
    const response = await apiClient.get<ApiResponse<FinishedGood[]>>('/master/finished-goods/by-category', {
      params: { category },
    });
    return response.data.data || [];
  },
  getLowStock: async (): Promise<FinishedGood[]> => {
    const response = await apiClient.get<ApiResponse<FinishedGood[]>>('/master/finished-goods/low-stock');
    return response.data.data || [];
  },
  updateStock: async (id: string, quantity: number, type: 'in' | 'out'): Promise<FinishedGood> => {
    const response = await apiClient.post<ApiResponse<FinishedGood>>(`/master/finished-goods/${id}/stock`, {
      quantity,
      type,
    });
    return response.data.data!;
  },
};
