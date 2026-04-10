import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse, Company } from '@/types';

export const companyApi = {
  // Super Admin routes
  getCompanies: async (): Promise<Company[]> => {
    const response = await apiClient.get<ApiResponse<Company[]>>('/companies');
    return response.data.data!;
  },
  
  createCompany: async (data: Partial<Company>): Promise<Company> => {
    const response = await apiClient.post<ApiResponse<Company>>('/companies', data);
    return response.data.data!;
  },
  
  updateSubscription: async (id: string, data: any): Promise<Company> => {
    const response = await apiClient.put<ApiResponse<Company>>(`/companies/${id}/subscription`, data);
    return response.data.data!;
  },
  
  deleteCompany: async (id: string): Promise<void> => {
    await apiClient.delete(`/companies/${id}`);
  },
  
  // Company routes
  getMyCompany: async (): Promise<Company> => {
    const response = await apiClient.get<ApiResponse<Company>>('/companies/my');
    return response.data.data!;
  },
  
  getCompany: async (id: string): Promise<Company> => {
    const response = await apiClient.get<ApiResponse<Company>>(`/companies/${id}`);
    return response.data.data!;
  },
  
  updateCompany: async (id: string, data: Partial<Company>): Promise<Company> => {
    const response = await apiClient.put<ApiResponse<Company>>(`/companies/${id}`, data);
    return response.data.data!;
  },
  
  updateSettings: async (data: any): Promise<Company> => {
    const response = await apiClient.put<ApiResponse<Company>>('/companies/settings/my', data);
    return response.data.data!;
  },
};
