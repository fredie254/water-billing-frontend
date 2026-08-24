// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole =
  | 'super_admin'        // L1 — System Administrator
  | 'tenant_admin'       // L2 — Utility Manager
  | 'manager'            // L2 — Operations Manager
  | 'finance_manager'    // L3 — Finance Manager
  | 'billing_officer'    // L4 — Billing Officer
  | 'customer_service'   // L5 — Customer Service
  | 'metering_supervisor'// L6 — Metering Supervisor
  | 'meter_reader'       // L7 — Field Officer
  | 'accountant'         // L8 — Accountant / Cashier
  | 'auditor'            // L9 — Auditor (read-only)
  | 'customer';          // L10 — Customer (own account only)

export type Permission =
  // Customers
  | 'customers.view' | 'customers.create' | 'customers.edit' | 'customers.update' | 'customers.delete'
  // Properties
  | 'properties.view' | 'properties.create' | 'properties.edit'
  // Connections
  | 'connections.view' | 'connections.create' | 'connections.edit'
  // Meters
  | 'meters.view' | 'meters.create' | 'meters.edit' | 'meters.update' | 'meters.replace' | 'meters.decommission'
  // Readings
  | 'readings.view' | 'readings.create' | 'readings.update' | 'readings.approve' | 'readings.reject'
  // Billing — both naming conventions supported
  | 'bills.view'
  | 'bills.create'  | 'billing.generate'
  | 'bills.approve' | 'billing.approve'
  | 'bills.cancel'  | 'billing.cancel'
  | 'bills.void'    | 'billing.adjust'
  // Payments
  | 'payments.view' | 'payments.create' | 'payments.allocate' | 'payments.reverse'
  // Receipts
  | 'receipts.view'
  // Arrears & Disconnections
  | 'arrears.view' | 'arrears.manage'
  | 'disconnections.view' | 'disconnections.approve' | 'disconnections.execute'
  // Reports
  | 'reports.view' | 'reports.export'
  // Notifications
  | 'notifications.view' | 'notifications.manage'
  // Inventory
  | 'inventory.view' | 'inventory.manage'
  // Settings
  | 'settings.view' | 'settings.manage'
  // Users & Roles
  | 'users.view' | 'users.create' | 'users.edit' | 'users.deactivate' | 'users.manage'
  | 'roles.manage'
  // Audit
  | 'audit.view';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // L1 — System Administrator: unrestricted
  super_admin: [
    'customers.view','customers.create','customers.edit','customers.update','customers.delete',
    'properties.view','properties.create','properties.edit',
    'connections.view','connections.create','connections.edit',
    'meters.view','meters.create','meters.edit','meters.update','meters.replace','meters.decommission',
    'readings.view','readings.create','readings.update','readings.approve','readings.reject',
    'bills.view','bills.create','billing.generate','bills.approve','billing.approve',
    'bills.cancel','billing.cancel','bills.void','billing.adjust',
    'payments.view','payments.create','payments.allocate','payments.reverse',
    'receipts.view',
    'arrears.view','arrears.manage',
    'disconnections.view','disconnections.approve','disconnections.execute',
    'reports.view','reports.export',
    'notifications.view','notifications.manage',
    'inventory.view','inventory.manage',
    'settings.view','settings.manage',
    'users.view','users.create','users.edit','users.deactivate','users.manage',
    'roles.manage',
    'audit.view',
  ],
  // L2 — Utility Manager: all operations + user/role management
  tenant_admin: [
    'customers.view','customers.create','customers.edit','customers.update','customers.delete',
    'properties.view','properties.create','properties.edit',
    'connections.view','connections.create','connections.edit',
    'meters.view','meters.create','meters.edit','meters.update','meters.replace','meters.decommission',
    'readings.view','readings.create','readings.update','readings.approve','readings.reject',
    'bills.view','bills.create','billing.generate','bills.approve','billing.approve',
    'bills.cancel','billing.cancel','bills.void','billing.adjust',
    'payments.view','payments.create','payments.allocate','payments.reverse',
    'receipts.view',
    'arrears.view','arrears.manage',
    'disconnections.view','disconnections.approve','disconnections.execute',
    'reports.view','reports.export',
    'notifications.view','notifications.manage',
    'inventory.view','inventory.manage',
    'settings.view','settings.manage',
    'users.view','users.create','users.edit','users.deactivate','users.manage',
    'roles.manage',
    'audit.view',
  ],
  // L2 — Operations Manager: broad ops minus role/settings management
  manager: [
    'customers.view','customers.create','customers.edit','customers.update',
    'properties.view','properties.create','properties.edit',
    'connections.view','connections.create','connections.edit',
    'meters.view','meters.create','meters.edit','meters.update','meters.replace',
    'readings.view','readings.update','readings.approve','readings.reject',
    'bills.view','bills.create','billing.generate','bills.approve','billing.approve',
    'bills.cancel','billing.cancel','billing.adjust',
    'payments.view','payments.create','payments.allocate',
    'receipts.view',
    'arrears.view','arrears.manage',
    'disconnections.view','disconnections.approve','disconnections.execute',
    'reports.view','reports.export',
    'notifications.view','notifications.manage',
    'inventory.view','inventory.manage',
    'settings.view',
    'users.view',
    'audit.view',
  ],
  // L3 — Finance Manager: billing, payments, financial reports
  finance_manager: [
    'customers.view',
    'bills.view','bills.create','billing.generate','bills.approve','billing.approve',
    'bills.cancel','billing.cancel','bills.void','billing.adjust',
    'payments.view','payments.create','payments.allocate','payments.reverse',
    'receipts.view',
    'arrears.view','arrears.manage',
    'disconnections.view','disconnections.approve',
    'reports.view','reports.export',
    'notifications.view',
    'audit.view',
  ],
  // L4 — Billing Officer: bill generation, payment recording
  billing_officer: [
    'customers.view','customers.create','customers.edit','customers.update',
    'properties.view',
    'connections.view',
    'meters.view',
    'readings.view','readings.update',
    'bills.view','bills.create','billing.generate','bills.approve','billing.approve',
    'bills.cancel','billing.cancel',
    'payments.view','payments.create','payments.allocate',
    'receipts.view',
    'arrears.view',
    'disconnections.view',
    'reports.view','reports.export',
    'notifications.view',
  ],
  // L5 — Customer Service Officer: account & enquiry support
  customer_service: [
    'customers.view','customers.create','customers.edit','customers.update',
    'properties.view',
    'connections.view',
    'meters.view',
    'readings.view',
    'bills.view',
    'payments.view',
    'receipts.view',
    'arrears.view',
    'disconnections.view',
    'reports.view',
    'notifications.view',
  ],
  // L6 — Metering Supervisor: meters, reading approval, inventory
  metering_supervisor: [
    'customers.view',
    'meters.view','meters.create','meters.edit','meters.update','meters.replace','meters.decommission',
    'readings.view','readings.create','readings.update','readings.approve','readings.reject',
    'reports.view',
    'inventory.view','inventory.manage',
    'notifications.view',
  ],
  // L7 — Field Officer / Meter Reader: reading capture + meter view
  meter_reader: [
    'customers.view',
    'meters.view','meters.replace',
    'readings.view','readings.create','readings.update',
    'inventory.view',
  ],
  // L8 — Accountant / Cashier: payments & reconciliation
  accountant: [
    'customers.view',
    'bills.view',
    'payments.view','payments.create','payments.allocate',
    'receipts.view',
    'arrears.view',
    'reports.view','reports.export',
  ],
  // L9 — Auditor: read-only across all modules
  auditor: [
    'customers.view',
    'properties.view',
    'connections.view',
    'meters.view',
    'readings.view',
    'bills.view',
    'payments.view',
    'receipts.view',
    'arrears.view',
    'disconnections.view',
    'reports.view','reports.export',
    'audit.view',
  ],
  // L10 — Customer: own account, bills, payments, receipts
  customer: [
    'customers.view',
    'bills.view',
    'payments.view',
    'receipts.view',
  ],
};

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  customerId?: string; // links customer-role users to their Customer record
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Tenant ────────────────────────────────────────────────────────────────────
export type TenantType = 'utility' | 'estate' | 'apartment' | 'institution' | 'other';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  plan: 'starter' | 'professional' | 'enterprise';
  phone?: string;
  email?: string;
  address?: string;
  logo?: string;
  currency: string;
  status: 'active' | 'suspended' | 'trial';
  settings: Record<string, unknown>;
  createdAt: string;
}

// ─── Zone & Route ──────────────────────────────────────────────────────────────
export interface Zone {
  id: string;
  tenantId: string;
  code: string;               // e.g. KRG, KUT, SAG
  name: string;
  subCounty: string;          // Kirinyaga Central | East | West | North | South
  description?: string;
  totalConnections: number;
  activeConnections: number;
  routeCount: number;
  area?: number;              // km²
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface MeterRoute {
  id: string;
  tenantId: string;
  zoneId: string;
  zoneName?: string;
  zoneCode?: string;
  routeCode: string;          // e.g. KRG-01
  name: string;
  description?: string;
  readerId?: string;
  readerName?: string;
  connectionCount: number;
  lastReadingDate?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// ─── Customer ──────────────────────────────────────────────────────────────────
export type CustomerType = 'residential' | 'commercial' | 'industrial' | 'institutional' | 'government' | 'bulk';
export type CustomerIdType = 'national_id' | 'passport' | 'huduma_number' | 'kra_pin' | 'company_reg';

export interface Customer {
  id: string;
  tenantId: string;
  customerNo: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  idType?: CustomerIdType;
  address?: string;
  customerType?: CustomerType;
  status: 'active' | 'inactive' | 'suspended';
  totalConnections?: number;
  outstandingBalance?: number;
  createdAt: string;
}

// ─── Complaint ─────────────────────────────────────────────────────────────────
export type ComplaintCategory =
  | 'billing_dispute' | 'low_pressure' | 'water_quality' | 'meter_tampering'
  | 'leakage' | 'disconnection' | 'service_delivery' | 'other';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Complaint {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  accountNumber?: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ─── Service Request ───────────────────────────────────────────────────────────
export type ServiceRequestType =
  | 'new_connection' | 'meter_replacement' | 'reconnection' | 'disconnection_request'
  | 'tariff_change' | 'account_transfer' | 'meter_reading_dispute' | 'other';
export type ServiceRequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';

export interface ServiceRequest {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  accountNumber?: string;
  requestType: ServiceRequestType;
  subject: string;
  description: string;
  status: ServiceRequestStatus;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ─── Customer Communication ────────────────────────────────────────────────────
export type CommunicationType = 'sms' | 'email' | 'phone_call' | 'in_person' | 'letter';
export type CommunicationDirection = 'inbound' | 'outbound';

export interface CustomerCommunication {
  id: string;
  tenantId: string;
  customerId: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  message: string;
  staffName?: string;
  status: 'sent' | 'delivered' | 'failed' | 'received';
  createdAt: string;
}

// ─── Property ──────────────────────────────────────────────────────────────────
export type PropertyType = 'residential' | 'commercial' | 'industrial' | 'institutional';
export type PropertyConnectionStatus = 'connected' | 'not_connected' | 'disconnected';

export interface Property {
  id: string;
  tenantId: string;
  // Owner (customer)
  customerId: string;
  customerName?: string;
  ownerPhone?: string;
  // Occupant / tenant (may differ from owner)
  occupantName?: string;
  occupantPhone?: string;
  // Location
  zoneId?: string;
  zoneName?: string;
  address: string;
  unitNumber?: string;   // for apartments / multi-unit
  plotNumber?: string;
  propertyType: PropertyType;
  latitude?: number;
  longitude?: number;
  // Status
  connectionStatus?: PropertyConnectionStatus;
  connections?: { status?: string }[];
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

// ─── Meter ─────────────────────────────────────────────────────────────────────
export type MeterType = 'mechanical' | 'digital' | 'smart_iot';
export type MeterStatus = 'active' | 'inactive' | 'faulty' | 'replaced' | 'removed' | 'tampered' | 'disconnected';

export interface Meter {
  id: string;
  tenantId: string;
  meterNumber?: string;        // barcode / asset number
  serialNumber: string;
  brand?: string;
  model?: string;
  size?: string;
  type: MeterType;
  status: MeterStatus;
  // Installation
  propertyId?: string;
  propertyAddress?: string;
  customerId?: string;
  customerName?: string;
  installationLocation?: string;
  installedAt?: string;
  initialReading?: number;
  // Readings
  lastReading?: number;
  lastReadingDate?: string;
  // Maintenance
  calibrationDate?: string;
  inspectionDate?: string;
  replacedById?: string;       // ID of the meter that replaced this one
  notes?: string;
  createdAt: string;
}

// ─── Meter Event (history) ────────────────────────────────────────────────────
export type MeterEventType =
  | 'installation' | 'reading' | 'calibration' | 'inspection'
  | 'replacement' | 'removal' | 'fault_reported' | 'tampering_detected'
  | 'repair' | 'status_change' | 'note';

export interface MeterEvent {
  id: string;
  tenantId: string;
  meterId: string;
  eventType: MeterEventType;
  description: string;
  performedBy?: string;
  notes?: string;
  createdAt: string;
}

// ─── Connection ────────────────────────────────────────────────────────────────
export type ConnectionStatus = 'active' | 'inactive' | 'disconnected' | 'suspended';

export interface Connection {
  id: string;
  tenantId: string;
  propertyId: string;
  propertyAddress?: string;
  meterId: string;
  meterSerial?: string;
  customerId: string;
  customerName?: string;
  customerNo?: string;
  accountNumber: string;
  connectionType: 'domestic' | 'commercial' | 'industrial' | 'bulk';
  tariffId: string;
  tariffName?: string;
  deposit?: number;
  status: ConnectionStatus;
  connectedAt: string;
  createdAt: string;
}

// ─── Tariff ────────────────────────────────────────────────────────────────────
export type BillingCycle = 'monthly' | 'bi_monthly' | 'quarterly';

export interface TariffBlock {
  id?: string;
  tariffId?: string;
  fromUnits: number;
  toUnits: number | null;
  ratePerUnit: number;
}

export interface Tariff {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  currency: string;
  standingCharge: number;
  minimumCharge: number;
  penaltyRate: number;
  billingCycle: BillingCycle;
  blocks: TariffBlock[];
  connectionCount?: number;
  createdAt: string;
}

// ─── Meter Reading ─────────────────────────────────────────────────────────────
export type ReadingType = 'manual' | 'iot' | 'estimate';

export type ReadingFlag = 'negative_consumption' | 'abnormal_high' | 'meter_reset' | 'manual_entry_error' | 'none';

export interface MeterReading {
  id: string;
  tenantId: string;
  connectionId: string;
  accountNumber?: string;
  meterId: string;
  meterSerial?: string;
  customerName?: string;
  readingValue: number;
  previousReading?: number;
  unitsConsumed?: number;
  readingDate: string;
  readingType: ReadingType;
  readerId?: string;
  readerName?: string;
  imageUrl?: string;
  notes?: string;
  // Validation
  flagged?: boolean;
  flagReason?: ReadingFlag;
  flagNote?: string;
  validated?: boolean;
  validatedBy?: string;
  createdAt: string;
}

// ─── Billing Period (Cycle Run) ────────────────────────────────────────────────
export type BillingPeriodStatus = 'scheduled' | 'reading' | 'billing' | 'completed' | 'cancelled';

export interface BillingPeriod {
  id: string;
  tenantId: string;
  name: string;                // e.g. "August 2026"
  cycleType: BillingCycle;     // monthly | bi_monthly | quarterly
  readingPeriodStart: string;
  readingPeriodEnd: string;
  billingDate: string;
  dueDate: string;
  status: BillingPeriodStatus;
  billsGenerated?: number;
  totalAmount?: number;
  notes?: string;
  createdAt: string;
}

// ─── Bill ──────────────────────────────────────────────────────────────────────
export type BillStatus = 'draft' | 'pending' | 'issued' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'void';

export interface BillItem {
  id: string;
  billId: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  type?: 'water' | 'fixed' | 'sewerage' | 'penalty' | 'discount' | 'tax' | 'other';
}

export interface Bill {
  id: string;
  tenantId: string;
  connectionId: string;
  accountNumber?: string;
  customerId: string;
  customerName?: string;
  propertyId?: string;
  propertyAddress?: string;
  meterSerial?: string;
  tariffId?: string;
  tariffName?: string;
  billingCycleId?: string;
  billNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  consumptionCharge: number;
  standingCharge: number;
  sewerageCharge?: number;
  penalties: number;
  adjustments: number;
  discounts?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: BillStatus;
  issuedAt?: string;
  items: BillItem[];
  createdAt: string;
}

// ─── Payment Allocation ────────────────────────────────────────────────────────
export interface PaymentAllocation {
  billId: string;
  billNumber: string;
  description: string;
  allocatedAmount: number;
}

// ─── Payment ───────────────────────────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'mpesa' | 'bank_transfer' | 'cheque' | 'card' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface Payment {
  id: string;
  tenantId: string;
  connectionId: string;
  accountNumber?: string;
  customerId: string;
  customerName?: string;
  billId?: string;
  billNumber?: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  mpesaCode?: string;
  phoneNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  status: PaymentStatus;
  notes?: string;
  allocations?: PaymentAllocation[];
  remainingAmount?: number;
  paidAt: string;
  createdAt: string;
}

// ─── Receipt ──────────────────────────────────────────────────────────────────
export type ReceiptStatus = 'issued' | 'voided' | 'printed';

export interface Receipt {
  id: string;
  tenantId: string;
  receiptNumber: string;
  paymentId: string;
  customerId: string;
  customerName?: string;
  accountNumber?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  mpesaCode?: string;
  allocations: PaymentAllocation[];
  remainingBalance: number;
  status: ReceiptStatus;
  issuedAt: string;
  createdAt: string;
}

// ─── Notification ──────────────────────────────────────────────────────────────
export type NotificationEventType =
  | 'new_bill' | 'payment_received' | 'payment_failed' | 'bill_overdue'
  | 'service_disconnected' | 'service_restored' | 'reading_reminder'
  | 'high_consumption' | 'leak_detected' | 'meter_tampering'
  | 'account_suspension' | 'payment_plan_created' | 'disconnection_notice';

export type NotificationChannel = 'sms' | 'email' | 'push' | 'whatsapp';

export type NotificationDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  accountNumber?: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  subject?: string;
  message: string;
  recipient: string;
  status: NotificationDeliveryStatus;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  type: 'sms' | 'email' | 'push';
  subject?: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  createdAt: string;
}

// ─── Arrears & Credit Control ──────────────────────────────────────────────────
export type AgingBucket = 'current' | '1_30' | '31_60' | '61_90' | '90_plus';

export type PaymentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';

export interface PaymentPlanInstallment {
  id: string;
  planId: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
}

export interface PaymentPlan {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  accountNumber?: string;
  connectionId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: PaymentPlanInstallment[];
  status: PaymentPlanStatus;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

// ─── Disconnection Workflow ────────────────────────────────────────────────────
export type DisconnectionStatus =
  | 'pending_reminder' | 'reminder_sent' | 'overdue' | 'notice_issued'
  | 'pending_approval' | 'approved' | 'disconnected'
  | 'payment_received' | 'reconnection_requested' | 'reconnection_approved'
  | 'reconnected' | 'cancelled';

export interface DisconnectionAuditEntry {
  id: string;
  orderId: string;
  action: string;
  fromStatus?: DisconnectionStatus;
  toStatus: DisconnectionStatus;
  performedBy: string;
  notes?: string;
  createdAt: string;
}

export interface DisconnectionOrder {
  id: string;
  tenantId: string;
  customerId: string;
  customerName?: string;
  accountNumber?: string;
  connectionId: string;
  propertyAddress?: string;
  outstandingAmount: number;
  daysOverdue: number;
  status: DisconnectionStatus;
  reminderSentAt?: string;
  noticeSentAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  disconnectedAt?: string;
  disconnectedBy?: string;
  reconnectionRequestedAt?: string;
  reconnectionApprovedBy?: string;
  reconnectedAt?: string;
  notes?: string;
  auditTrail: DisconnectionAuditEntry[];
  createdAt: string;
}

// ─── Inventory & Asset Management ─────────────────────────────────────────────
export type AssetCategory =
  | 'water_meter' | 'pipe' | 'valve' | 'pump' | 'tank'
  | 'pressure_sensor' | 'iot_device' | 'meter_box' | 'fitting' | 'other';

export type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'decommissioned';
export type AssetStatus = 'active' | 'in_stock' | 'under_maintenance' | 'decommissioned' | 'lost';

export interface Asset {
  id: string;
  tenantId: string;
  assetNumber: string;
  name: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  specifications?: string;
  location?: string;
  zoneId?: string;
  zoneName?: string;
  condition: AssetCondition;
  status: AssetStatus;
  purchaseDate?: string;
  purchasePrice?: number;
  supplier?: string;
  warrantyExpiry?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
}

export type InventoryCategory = 'meters' | 'pipes' | 'valves' | 'fittings' | 'maintenance_materials' | 'other';

export interface InventoryItem {
  id: string;
  tenantId: string;
  itemCode: string;
  name: string;
  category: InventoryCategory;
  description?: string;
  unit: string;
  quantityInStock: number;
  quantityInstalled: number;
  minimumStock: number;
  reorderLevel: number;
  unitCost?: number;
  totalValue?: number;
  supplier?: string;
  warehouseLocation?: string;
  lastRestockedAt?: string;
  createdAt: string;
}

export type MaintenanceType = 'preventive' | 'corrective' | 'inspection' | 'upgrade' | 'decommission';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MaintenanceRecord {
  id: string;
  tenantId: string;
  assetId: string;
  assetNumber?: string;
  assetName?: string;
  maintenanceType: MaintenanceType;
  description: string;
  performedBy?: string;
  cost?: number;
  partsUsed?: string;
  status: MaintenanceStatus;
  scheduledDate: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

// ─── IoT Device ────────────────────────────────────────────────────────────────
export interface IoTDevice {
  id: string;
  tenantId: string;
  meterId: string;
  meterSerial?: string;
  deviceId: string;
  deviceType: string;
  apiKey: string;
  lastSeen?: string;
  status: 'active' | 'inactive' | 'offline';
  createdAt: string;
}

// ─── Report / Analytics ────────────────────────────────────────────────────────
export interface DashboardRecentBill {
  id: string;
  billNumber: string;
  customerName: string;
  accountNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  status: string;
  issuedAt?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  activeConnections: number;
  totalBillsIssued: number;
  totalRevenue: number;
  outstandingBalance: number;
  collectionRate: number;
  overdueAccounts: number;
  readingsDueThisMonth: number;
  recentBills: DashboardRecentBill[];
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  collected: number;
  outstanding: number;
}

export interface ConsumptionDataPoint {
  month: string;
  units: number;
  connections: number;
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}

// ─── API Error ─────────────────────────────────────────────────────────────────
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────────
export type AuditAction =
  | 'login' | 'logout' | 'login_failed'
  | 'user_created' | 'user_updated' | 'user_activated' | 'user_deactivated' | 'user_deleted'
  | 'customer_created' | 'customer_updated' | 'customer_deleted'
  | 'connection_created' | 'connection_updated' | 'connection_suspended' | 'connection_activated'
  | 'meter_created' | 'meter_updated'
  | 'reading_recorded'
  | 'bill_generated' | 'bill_cancelled'
  | 'payment_recorded' | 'payment_reversed'
  | 'tariff_created' | 'tariff_updated'
  | 'settings_updated'
  | 'password_changed';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  resourceName?: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

export interface LoginHistory {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed';
  createdAt: string;
}

