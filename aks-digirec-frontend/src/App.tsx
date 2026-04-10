import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage, RegisterPage } from './pages/auth';
import { DashboardPage } from './pages/dashboard';
import { MasterDataPage } from './pages/master';
import { WorkersActivityPage } from './pages/workers';
import { CashRegisterPage } from './pages/cash';
import { BankPage } from './pages/bank';
import { CompositionPage } from './pages/composition';
import { ProductionPage } from './pages/production';
import { ReportsPage } from './pages/reports';
import { AdminPage } from './pages/admin';
import './styles/themes.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/master" element={<MasterDataPage />} />
              <Route path="/workers" element={<WorkersActivityPage />} />
              <Route path="/cash" element={<CashRegisterPage />} />
              <Route path="/bank" element={<BankPage />} />
              <Route path="/composition" element={<CompositionPage />} />
              <Route path="/production" element={<ProductionPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;
