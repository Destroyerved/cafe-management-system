import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/admin/DashboardPage';
import POSTerminal from './pages/pos/POSTerminal';
import PosSelect from './pages/pos/PosSelect';
import KitchenDisplay from './pages/kitchen/KitchenDisplay';
import KitchenSelect from './pages/kitchen/KitchenSelect';
import SelfOrderRouter from './pages/self-order/SelfOrderRouter';

import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';

function IndexRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user.role === 'kitchen') return <Navigate to="/kitchen-select" replace />;
  return <Navigate to="/pos-select" replace />;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>

      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><IndexRedirect /></ProtectedRoute>} />
          <Route path="/dashboard/*" element={<ProtectedRoute><RoleRoute roles={['admin']}><DashboardPage /></RoleRoute></ProtectedRoute>} />
          <Route path="/pos/:config_id/*" element={<ProtectedRoute><POSTerminal /></ProtectedRoute>} />
          <Route path="/pos-select" element={<ProtectedRoute><PosSelect /></ProtectedRoute>} />
          <Route path="/kitchen/:session_id" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />
          <Route path="/kitchen-select" element={<ProtectedRoute><KitchenSelect /></ProtectedRoute>} />
          <Route path="/s/:token" element={<SelfOrderRouter />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
