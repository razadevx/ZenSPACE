import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface Role {
  _id: string;
  name: string;
  displayName: {
    en: string;
    ur: string;
  };
  permissions: string[];
}

export interface SystemUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  company?: {
    _id: string;
    name: string;
  };
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  roleId: string;
  phone?: string;
  department?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  department?: string;
  isActive?: boolean;
}

export interface UserPreferences {
  theme: string;
  language: string;
  notifications: {
    email: {
      enabled: boolean;
      dailySummary: boolean;
      weeklyReport: boolean;
      alerts: boolean;
    };
    push: {
      enabled: boolean;
      newSales: boolean;
      lowStock: boolean;
      payments: boolean;
    };
    sms: {
      enabled: boolean;
      criticalAlerts: boolean;
    };
  };
  dateFormat: string;
  timeFormat: string;
  currency: string;
}

export const userApi = {
  // Get all users for the current company
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }): Promise<{ data: SystemUser[]; pagination: any }> => {
    const response = await apiClient.get('/users', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || response.data.meta || {}
    };
  },

  // Get single user
  getUser: async (id: string): Promise<SystemUser> => {
    const response = await apiClient.get<ApiResponse<SystemUser>>(`/users/${id}`);
    return response.data.data!;
  },

  // Create user
  createUser: async (data: CreateUserRequest): Promise<SystemUser> => {
    const response = await apiClient.post<ApiResponse<SystemUser>>('/users', data);
    return response.data.data!;
  },

  // Update user
  updateUser: async (id: string, data: UpdateUserRequest): Promise<SystemUser> => {
    const response = await apiClient.put<ApiResponse<SystemUser>>(`/users/${id}`, data);
    return response.data.data!;
  },

  // Delete user
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  // Get all roles
  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get<ApiResponse<Role[]>>('/roles');
    return response.data.data || [];
  },

  // Get user preferences
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await apiClient.get<ApiResponse<UserPreferences>>('/users/preferences/me');
    return response.data.data || {
      theme: 'default',
      language: 'en',
      notifications: {
        email: { enabled: true, dailySummary: true, weeklyReport: true, alerts: true },
        push: { enabled: true, newSales: true, lowStock: true, payments: true },
        sms: { enabled: false, criticalAlerts: false }
      },
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      currency: 'PKR'
    };
  },

  // Update user preferences
  updatePreferences: async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
    const response = await apiClient.put<ApiResponse<UserPreferences>>('/users/preferences/me', data);
    return response.data.data!;
  },

  // Update profile
  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string }): Promise<SystemUser> => {
    const response = await apiClient.put<ApiResponse<SystemUser>>('/users/profile/me', data);
    return response.data.data!;
  }
};
