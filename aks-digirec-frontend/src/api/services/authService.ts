import apiClient from '../interceptors/axiosConfig';
import type { LoginCredentials, AuthResponse, ApiResponse, User } from '@/types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<any>>('/auth/login', credentials);
    const d = response.data.data!;
    return {
      user: d.user,
      accessToken: d.accessToken || d.token,
      refreshToken: d.refreshToken,
      company: d.company ?? d.user?.company,
    };
  },

  signup: async (data: {
    companyName: string;
    name: string;
    email: string;
    password: string;
    phone: string;
    city: string;
    country: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<any>>('/auth/register', data);
    const d = response.data.data!;
    return {
      user: d.user,
      accessToken: d.accessToken || d.token,
      refreshToken: d.refreshToken,
      company: d.company ?? d.user?.company,
    };
  },
  
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
  
  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
      refreshToken,
    });
    return response.data.data!;
  },
  
  me: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  },
  
  verifyOTP: async (email: string, otp: string): Promise<void> => {
    await apiClient.post('/auth/verify-otp', { email, otp });
  },
  
  resendOTP: async (email: string): Promise<void> => {
    await apiClient.post('/auth/resend-otp', { email });
  },
  
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },
  
  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, password });
  },
};
