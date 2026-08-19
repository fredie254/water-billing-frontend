import type { UserRole, Permission } from '@/types';
import { ROLE_PERMISSIONS } from '@/types';

export { ROLE_PERMISSIONS };

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role]?.includes(permission) ?? false;

export const PERMISSION_GROUPS: { group: string; permissions: { key: Permission; label: string }[] }[] = [
  {
    group: 'Customers',
    permissions: [
      { key: 'customers.view',   label: 'View Customers' },
      { key: 'customers.create', label: 'Create Customers' },
      { key: 'customers.update', label: 'Update Customers' },
      { key: 'customers.delete', label: 'Delete Customers' },
    ],
  },
  {
    group: 'Connections',
    permissions: [
      { key: 'connections.view',   label: 'View Connections' },
      { key: 'connections.create', label: 'Create Connections' },
      { key: 'connections.edit',   label: 'Edit Connections' },
    ],
  },
  {
    group: 'Meters',
    permissions: [
      { key: 'meters.view',         label: 'View Meters' },
      { key: 'meters.create',       label: 'Install Meters' },
      { key: 'meters.update',       label: 'Update Meters' },
      { key: 'meters.replace',      label: 'Replace Meters' },
      { key: 'meters.decommission', label: 'Decommission Meters' },
    ],
  },
  {
    group: 'Readings',
    permissions: [
      { key: 'readings.view',    label: 'View Readings' },
      { key: 'readings.create',  label: 'Record Readings' },
      { key: 'readings.update',  label: 'Update / Correct Readings' },
      { key: 'readings.approve', label: 'Approve Readings' },
      { key: 'readings.reject',  label: 'Reject Readings' },
    ],
  },
  {
    group: 'Billing',
    permissions: [
      { key: 'bills.view',       label: 'View Bills' },
      { key: 'billing.generate', label: 'Generate Bills' },
      { key: 'billing.approve',  label: 'Approve Bills' },
      { key: 'billing.cancel',   label: 'Cancel Bills' },
      { key: 'billing.adjust',   label: 'Adjust / Write-off Bills' },
    ],
  },
  {
    group: 'Payments',
    permissions: [
      { key: 'payments.view',     label: 'View Payments' },
      { key: 'payments.create',   label: 'Record Payments' },
      { key: 'payments.allocate', label: 'Allocate Payments' },
      { key: 'payments.reverse',  label: 'Reverse Payments' },
      { key: 'receipts.view',     label: 'View Receipts' },
    ],
  },
  {
    group: 'Arrears & Disconnections',
    permissions: [
      { key: 'arrears.view',            label: 'View Arrears' },
      { key: 'arrears.manage',          label: 'Manage Arrears & Plans' },
      { key: 'disconnections.view',     label: 'View Disconnections' },
      { key: 'disconnections.approve',  label: 'Approve Disconnections' },
      { key: 'disconnections.execute',  label: 'Execute Disconnections' },
    ],
  },
  {
    group: 'Reports & Notifications',
    permissions: [
      { key: 'reports.view',          label: 'View Reports' },
      { key: 'reports.export',        label: 'Export Reports' },
      { key: 'notifications.view',    label: 'View Notifications' },
      { key: 'notifications.manage',  label: 'Manage Notifications' },
    ],
  },
  {
    group: 'Inventory',
    permissions: [
      { key: 'inventory.view',   label: 'View Inventory & Assets' },
      { key: 'inventory.manage', label: 'Manage Inventory & Assets' },
    ],
  },
  {
    group: 'Administration',
    permissions: [
      { key: 'users.manage',     label: 'Manage Users' },
      { key: 'roles.manage',     label: 'Manage Roles & Permissions' },
      { key: 'settings.manage',  label: 'Manage Settings' },
      { key: 'audit.view',       label: 'View Audit Logs' },
    ],
  },
];
