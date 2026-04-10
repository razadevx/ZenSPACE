import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface WorkerActivityPayload {
  date: string;
  sectionGroup?: string;
}

export interface SectionGroup {
  id: string;
  label: string;
}

export const workersApi = {
  getSectionGroups: async (): Promise<SectionGroup[]> => {
    const response = await apiClient.get<ApiResponse<SectionGroup[]>>('/workers/section-groups');
    const data = (response.data as any).data ?? [];
    return Array.isArray(data) ? data : [];
  },

  getActivities: async (payload: WorkerActivityPayload) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/workers/activities', {
      params: payload,
    });
    const data = (response.data as any).data ?? [];
    return Array.isArray(data) ? data : [];
  },

  closeDay: async (date: string) => {
    await apiClient.post('/workers/close-day', { date });
  },

  closeWeek: async (date: string) => {
    await apiClient.post('/workers/close-week', { date });
  },
};
