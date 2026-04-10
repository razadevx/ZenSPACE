import { create } from 'zustand';
import type { Alert } from '@/types';

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: any;
}

interface UIState {
  // Sidebar/Navigation
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Modals
  activeModal: ModalState;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;
  
  // Alerts/Notifications
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, '_id' | 'createdAt'>) => void;
  removeAlert: (id: string) => void;
  markAlertRead: (id: string) => void;
  clearAlerts: () => void;
  
  // Loading states
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  
  // Page title
  pageTitle: string;
  setPageTitle: (title: string) => void;
  
  // Breadcrumbs
  breadcrumbs: Array<{ label: string; path?: string }>;
  setBreadcrumbs: (crumbs: Array<{ label: string; path?: string }>) => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  // Sidebar
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  // Modals
  activeModal: { isOpen: false, type: null, data: null },
  openModal: (type, data = null) => set({ activeModal: { isOpen: true, type, data } }),
  closeModal: () => set({ activeModal: { isOpen: false, type: null, data: null } }),
  
  // Alerts
  alerts: [],
  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };
    set((state) => ({ alerts: [newAlert, ...state.alerts].slice(0, 50) }));
  },
  removeAlert: (id) => set((state) => ({ 
    alerts: state.alerts.filter((a) => a._id !== id) 
  })),
  markAlertRead: (id) => set((state) => ({
    alerts: state.alerts.map((a) => 
      a._id === id ? { ...a, isRead: true } : a
    ),
  })),
  clearAlerts: () => set({ alerts: [] }),
  
  // Loading states
  loadingStates: {},
  setLoading: (key, loading) => set((state) => ({
    loadingStates: { ...state.loadingStates, [key]: loading },
  })),
  isLoading: (key) => !!get().loadingStates[key],
  
  // Page title
  pageTitle: '',
  setPageTitle: (title) => set({ pageTitle: title }),
  
  // Breadcrumbs
  breadcrumbs: [],
  setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),
}));
