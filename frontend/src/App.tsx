import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { DeviceDetailPage } from './pages/DeviceDetailPage';
import { TopologyPage } from './pages/TopologyPage';
import { AlertsPage } from './pages/AlertsPage';
import { IpamPage } from './pages/IpamPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomerAlertsPage, CustomerPortalPage } from './pages/CustomerPortalPage';
import type { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RoleRoute: React.FC<{ allowed: Role[]; children: React.ReactElement }> = ({ allowed, children }) => {
  const { hasRole } = useAuth();
  return hasRole(allowed) ? children : <Navigate to="/" replace />;
};

const HomePage: React.FC = () => {
  const { role } = useAuth();
  return role === 'CUSTOMER' ? <CustomerPortalPage /> : <DashboardPage />;
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="my-alerts" element={<RoleRoute allowed={['CUSTOMER']}><CustomerAlertsPage /></RoleRoute>} />
        <Route path="devices" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><DevicesPage /></RoleRoute>} />
        <Route path="devices/:id" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><DeviceDetailPage /></RoleRoute>} />
        <Route path="topology" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><TopologyPage /></RoleRoute>} />
        <Route path="alerts" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><AlertsPage /></RoleRoute>} />
        <Route path="ipam" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><IpamPage /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><ReportsPage /></RoleRoute>} />
        <Route path="audit" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><AuditLogPage /></RoleRoute>} />
        <Route path="settings" element={<RoleRoute allowed={['ADMIN', 'OPERATOR', 'VIEWER']}><SettingsPage /></RoleRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
