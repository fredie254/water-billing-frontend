import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/core/auth/authStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/connections': 'Connections',
  '/meters': 'Meters',
  '/readings': 'Meter Readings',
  '/zones': 'Zones & Routes',
  '/bills': 'Bills',
  '/payments': 'Payments',
  '/receipts': 'Receipts',
  '/field-officer':  'Field Officer',
  '/arrears':        'Arrears & Credit Control',
  '/disconnections': 'Disconnection & Reconnection',
  '/inventory':      'Inventory & Asset Management',
  '/tariffs':        'Tariffs',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/properties': 'Properties',
  '/users': 'Users & Access',
  '/audit-logs': 'Audit Logs',
  '/portal': 'My Account',
};

export const AppLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const title = PAGE_TITLES[location.pathname] ?? 'RUMAWASCO';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
