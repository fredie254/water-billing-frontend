import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { useAuthStore } from '@/core/auth/authStore';

// Pages
import { Login }          from '@/features/auth/pages/Login';
import { Dashboard }      from '@/features/dashboard/pages/Dashboard';
import { Customers }      from '@/features/customers/pages/Customers';
import { CustomerDetail } from '@/features/customers/pages/CustomerDetail';
import { Meters }         from '@/features/meters/pages/Meters';
import { Readings }       from '@/features/meters/pages/Readings';
import { Connections }    from '@/features/connections/pages/Connections';
import { Bills }          from '@/features/billing/pages/Bills';
import { BillDetail }     from '@/features/billing/pages/BillDetail';
import { Payments }       from '@/features/payments/pages/Payments';
import { Tariffs }        from '@/features/billing/pages/Tariffs';
import { Reports }        from '@/features/reports/pages/Reports';
import { Zones }          from '@/features/zones/pages/Zones';
import { Notifications }  from '@/features/notifications/pages/Notifications';
import { Settings }       from '@/features/settings/pages/Settings';
import { Users }          from '@/features/users/pages/Users';
import { AuditLogs }      from '@/features/audit/pages/AuditLogs';
import { Properties }     from '@/features/properties/pages/Properties';
import { PropertyDetail } from '@/features/properties/pages/PropertyDetail';
import { Receipts }       from '@/features/payments/pages/Receipts';
import { ReceiptDetail }  from '@/features/payments/pages/ReceiptDetail';
import { FieldOfficer }   from '@/features/field-officer/pages/FieldOfficer';
import { Arrears }        from '@/features/arrears/pages/Arrears';
import { Disconnections } from '@/features/disconnections/pages/Disconnections';
import { Inventory }     from '@/features/inventory/pages/Inventory';
import { CustomerPortal } from '@/features/customer-portal/pages/CustomerPortal';

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

/** Redirect to / if the current user's role is not in the allowed list. */
const RoleGuard = ({ roles, children }: { roles: string[]; children: React.ReactNode }) => {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/** Redirect customers to /portal; let staff through to the admin shell. */
const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  if (user?.role === 'customer') return <Navigate to="/portal" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route element={<AppLayout />}>
        <Route path="/"                  element={<StaffRoute><Dashboard /></StaffRoute>} />
        <Route path="/portal"            element={
          <RoleGuard roles={['customer']}>
            <CustomerPortal />
          </RoleGuard>
        } />
        <Route path="/customers"         element={<Customers />} />
        <Route path="/customers/:id"     element={<CustomerDetail />} />
        <Route path="/connections"       element={<Connections />} />
        <Route path="/meters"            element={<Meters />} />
        <Route path="/readings"          element={<Readings />} />
        <Route path="/bills"             element={<Bills />} />
        <Route path="/bills/:id"         element={<BillDetail />} />
        <Route path="/payments"          element={<Payments />} />
        <Route path="/receipts"          element={<Receipts />} />
        <Route path="/receipts/:id"      element={<ReceiptDetail />} />
        <Route path="/field-officer"     element={<FieldOfficer />} />
        <Route path="/arrears"           element={<Arrears />} />
        <Route path="/disconnections"    element={<Disconnections />} />
        <Route path="/inventory"         element={<Inventory />} />
        <Route path="/properties"        element={<Properties />} />
        <Route path="/properties/:id"    element={<PropertyDetail />} />
        <Route path="/zones"             element={<Zones />} />
        <Route path="/notifications"     element={<Notifications />} />

        {/* Role-restricted routes */}
        <Route path="/tariffs" element={
          <RoleGuard roles={['super_admin','tenant_admin','manager','billing_officer']}>
            <Tariffs />
          </RoleGuard>
        } />
        <Route path="/reports" element={
          <RoleGuard roles={['super_admin','tenant_admin','manager','billing_officer','customer_service']}>
            <Reports />
          </RoleGuard>
        } />
        <Route path="/settings" element={
          <RoleGuard roles={['super_admin','tenant_admin','manager']}>
            <Settings />
          </RoleGuard>
        } />
        <Route path="/users" element={
          <RoleGuard roles={['super_admin','tenant_admin']}>
            <Users />
          </RoleGuard>
        } />
        <Route path="/audit-logs" element={
          <RoleGuard roles={['super_admin','tenant_admin','manager']}>
            <AuditLogs />
          </RoleGuard>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
