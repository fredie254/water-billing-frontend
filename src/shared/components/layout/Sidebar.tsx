import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Gauge, Zap, FileText, CreditCard, BarChart3,
  Settings, ChevronRight, Droplets, MapPin, Route, Bell, Activity, X,
  UserCog, ClipboardList, Shield, Building2, Receipt, HardHat,
  AlertTriangle, ZapOff, Package, Home,
} from 'lucide-react';
import { cn } from '@/shared/utils/utils';
import { useAuthStore } from '@/core/auth/authStore';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'My Account',
    items: [
      { label: 'My Account', path: '/portal', icon: <Home className="w-5 h-5" />, roles: ['customer'] },
    ],
  },
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','customer_service','metering_supervisor','meter_reader','accountant','auditor'] },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Customers',     path: '/customers',   icon: <Users      className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','meter_reader','customer_service','accountant','auditor'] },
      { label: 'Properties',    path: '/properties',  icon: <Building2  className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','meter_reader','customer_service','auditor'] },
      { label: 'Connections',   path: '/connections', icon: <Zap        className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','billing_officer','meter_reader','customer_service','auditor'] },
      { label: 'Meters',        path: '/meters',      icon: <Gauge     className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','billing_officer','meter_reader','metering_supervisor','auditor'] },
      { label: 'Readings',       path: '/readings',      icon: <Activity  className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','billing_officer','meter_reader','metering_supervisor','auditor'] },
      { label: 'Field Officer',  path: '/field-officer', icon: <HardHat   className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','meter_reader','metering_supervisor'] },
      { label: 'Inventory',      path: '/inventory',     icon: <Package   className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','billing_officer','meter_reader','metering_supervisor'] },
      { label: 'Zones & Routes', path: '/zones',         icon: <MapPin    className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','meter_reader','metering_supervisor'] },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Bills',           path: '/bills',          icon: <FileText       className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','customer_service','accountant','auditor'] },
      { label: 'Payments',        path: '/payments',       icon: <CreditCard     className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','accountant','auditor'] },
      { label: 'Receipts',        path: '/receipts',       icon: <Receipt        className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','accountant','auditor'] },
      { label: 'Arrears',         path: '/arrears',        icon: <AlertTriangle  className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','auditor'] },
      { label: 'Disconnections',  path: '/disconnections', icon: <ZapOff         className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer','auditor'] },
      { label: 'Tariffs',         path: '/tariffs',        icon: <Route          className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','finance_manager','billing_officer'] },
    ],
  },
  {
    group: 'Analytics',
    items: [
      { label: 'Reports',       path: '/reports',       icon: <BarChart3 className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','billing_officer','customer_service'] },
      { label: 'Notifications', path: '/notifications', icon: <Bell      className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager','billing_officer','customer_service'] },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Users',      path: '/users',       icon: <UserCog       className="w-5 h-5" />, roles: ['super_admin','tenant_admin'] },
      { label: 'Audit Logs', path: '/audit-logs',  icon: <ClipboardList className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager'] },
      { label: 'Settings',   path: '/settings',    icon: <Settings      className="w-5 h-5" />, roles: ['super_admin','tenant_admin','manager'] },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { user } = useAuthStore();
  const role = user?.role;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-72 bg-gray-900 flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-[4.5rem] px-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-water-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg leading-none">RUMAWASCO</span>
              <p className="text-gray-500 text-xs leading-none mt-1">Water Management</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              item => !item.roles || !role || item.roles.includes(role)
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.group} className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1.5">
                  {group.group}
                </p>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-all duration-100 group mb-0.5',
                        isActive
                          ? 'bg-water-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )
                    }
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Role badge + User footer */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          {role && (
            <div className="mb-2.5 px-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-water-300 bg-water-900/60 px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3" />
                {role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-water-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base text-white font-medium truncate">{user?.name ?? 'User'}</p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
