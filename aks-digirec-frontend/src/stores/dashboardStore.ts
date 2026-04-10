import { create } from 'zustand';
import type { DashboardMetrics, Alert } from '@/types';

interface DashboardState {
  metrics: DashboardMetrics | null;
  alerts: Alert[];
  activities: any[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setMetrics: (metrics: DashboardMetrics) => void;
  setAlerts: (alerts: Alert[]) => void;
  setActivities: (activities: any[]) => void;
  addActivity: (activity: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  metrics: null,
  alerts: [],
  activities: [],
  isLoading: false,
  error: null,
  
  setMetrics: (metrics) => set({ metrics }),
  
  setAlerts: (alerts) => set({ alerts }),
  
  setActivities: (activities) => set({ activities }),
  
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities].slice(0, 100),
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  refreshDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      // This will be replaced with actual API call
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to refresh', isLoading: false });
    }
  },
}));
