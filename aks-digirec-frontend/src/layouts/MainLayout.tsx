import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { useAuthStore, useUIStore } from '@/stores';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function MainLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, company } = useAuthStore();
  const { alerts, addAlert } = useUIStore();
  
  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Check trial expiry
  useEffect(() => {
    if (company?.trialEndDate) {
      const daysRemaining = Math.ceil((new Date(company.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 7 && daysRemaining > 0) {
        addAlert({
          type: 'warning',
          title: 'Trial Expiring Soon',
          message: `Your trial will expire in ${daysRemaining} days. Please contact support to upgrade.`,
          isRead: false,
        });
      } else if (daysRemaining <= 0) {
        addAlert({
          type: 'error',
          title: 'Trial Expired',
          message: 'Your trial has expired. Please contact support to continue using the system.',
          isRead: false,
        });
      }
    }
  }, [company]);
  
  // Show alerts as toasts
  useEffect(() => {
    const unreadAlerts = alerts.filter((a) => !a.isRead);
    if (unreadAlerts.length > 0) {
      const latestAlert = unreadAlerts[0];
      toast[latestAlert.type](latestAlert.title, { description: latestAlert.message });
    }
  }, [alerts]);
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
