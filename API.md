# RUMAWASCO — Water Billing & Management System
## API Reference v1.0.0

**Production Base URL:** `https://api.rumawasco.nexusiot.xyz/api/v1`  
**Frontend:** `https://app.rumawasco.nexusiot.xyz`  
**Interactive Docs:** `https://api.rumawasco.nexusiot.xyz/api-docs`  
**Local Dev Base URL:** `http://localhost:3000/api/v1`  
**Database:** PostgreSQL · **Auth:** JWT Bearer · **Multi-tenant:** Yes

---

## Table of Contents

1. [System Data Flow](#1-system-data-flow)
2. [Getting Started](#2-getting-started)
3. [Authentication](#3-authentication)
4. [Standard Response Format](#4-standard-response-format)
5. [Error Codes](#5-error-codes)
6. [Pagination & Filtering](#6-pagination--filtering)
7. [Role-Based Access Control](#7-role-based-access-control)
8. [Endpoints](#8-endpoints)
   - [Health](#health)
   - [Auth](#auth)
   - [Customers](#customers)
   - [Properties](#properties)
   - [Connections](#connections)
   - [Meters](#meters)
   - [Meter Readings](#meter-readings)
   - [Billing / Invoices](#billing--invoices)
   - [Billing Periods](#billing-periods)
   - [Tariffs](#tariffs)
   - [Payments](#payments)
   - [Receipts](#receipts)
   - [Arrears & Payment Plans](#arrears--payment-plans)
   - [Disconnections](#disconnections)
   - [Zones & Routes](#zones--routes)
   - [Reports & Analytics](#reports--analytics)
   - [Notifications](#notifications)
   - [Inventory & Assets](#inventory--assets)
   - [Service Requests & Complaints](#service-requests--complaints)
   - [Users & Access](#users--access)
   - [Audit Logs](#audit-logs)
   - [Settings](#settings)
   - [Customer Portal](#customer-portal)
9. [Webhooks — M-Pesa Callback](#9-webhooks--m-pesa-callback)
10. [Scheduled Jobs (Cron)](#10-scheduled-jobs-cron)
11. [Environment Variables](#11-environment-variables)
12. [Rate Limits](#12-rate-limits)

---

## 1. System Data Flow

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    RUMAWASCO — END-TO-END DATA FLOW                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                          STEP 1 — ONBOARDING                           │
  │                                                                         │
  │  Admin registers Customer → creates Property → assigns Zone/Route      │
  │  → installs Meter → creates Connection (Customer + Meter + Tariff)     │
  │  → generates Account Number (ACC-XXXXXX)                               │
  └────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                      STEP 2 — METER READING                            │
  │                                                                         │
  │  Field Officer visits route → captures meter reading (manual/photo)    │
  │  → reading submitted as "pending"                                      │
  │  → Metering Supervisor reviews → Approve / Reject                      │
  │  → approved readings → eligible for billing                            │
  │                                                                         │
  │  Smart meters → IoT readings auto-ingested via /iot/readings           │
  └────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                       STEP 3 — BILL GENERATION                         │
  │                                                                         │
  │  Billing Officer triggers generate (single or bulk):                   │
  │    units = currentReading - previousReading                            │
  │    waterCharge = IBT tariff calculation across blocks                  │
  │    bill = waterCharge + standingCharge + arrears + sewerage + levy     │
  │         - discounts                                                     │
  │                                                                         │
  │  Bill status: draft → issued → (paid | partial | overdue | cancelled)  │
  │                                                                         │
  │  Bulk billing runs automatically on 1st of month (BILLING_CRON)        │
  │  Overdue detection runs daily (OVERDUE_CRON)                           │
  └────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    STEP 4 — BILL DELIVERY                              │
  │                                                                         │
  │  POST /invoices/:id/send                                               │
  │    → SMS via Africa's Talking (bill amount + due date + paybill)       │
  │    → Email via SendGrid (PDF attachment)                               │
  │    → Customer Portal (self-service view)                               │
  └────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                      STEP 5 — PAYMENT                                  │
  │                                                                         │
  │  Channel A — M-Pesa (self-service):                                    │
  │    Customer pays Paybill 247247 + Account Number                       │
  │    → Safaricom sends C2B callback to POST /payments/mpesa/callback     │
  │    → system auto-allocates payment → generates receipt → sends SMS     │
  │                                                                         │
  │  Channel B — STK Push (staff-initiated):                               │
  │    Staff triggers POST /payments/mpesa/stk-push                        │
  │    → Safaricom prompts customer's phone → callback → auto-allocate     │
  │                                                                         │
  │  Channel C — Manual (counter/bank):                                    │
  │    Staff records POST /payments                                        │
  │    → system allocates across outstanding bills (oldest first)          │
  │    → generates Receipt + updates Bill statuses                         │
  │                                                                         │
  │  Payment allocation order: oldest bills first, surplus = account credit│
  └────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                   STEP 6 — ARREARS & CREDIT CONTROL                   │
  │                                                                         │
  │  Overdue accounts detected daily (07:00 cron)                         │
  │  → Aging buckets: current / 1-30 / 31-60 / 61-90 / 90+ days          │
  │  → Payment plans offered (installment agreements)                      │
  │                                                                         │
  │  Disconnection workflow:                                               │
  │    pending_reminder → reminder_sent → notice_issued                   │
  │    → pending_approval → approved → disconnected                        │
  │    → (after payment) reconnection_requested → reconnection_approved    │
  │    → reconnected                                                       │
  └────────────────────────────┬────────────────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    STEP 7 — REPORTING & AUDIT                          │
  │                                                                         │
  │  GET /reports/dashboard     → KPI cards (live)                        │
  │  GET /reports/revenue-trend → monthly billed vs collected              │
  │  GET /reports/consumption-trend → m³ consumed per period              │
  │  GET /reports/aging         → debt aging analysis                     │
  │  GET /reports/collection-rate → efficiency by zone/period             │
  │  All writes → logged in audit_logs table automatically                │
  └─────────────────────────────────────────────────────────────────────────┘


MODULE DEPENDENCY MAP
─────────────────────
  Customer ──┐
             ├──► Connection ──► MeterReading ──► Bill ──► Payment ──► Receipt
  Property ──┤         │                           │
             │         ▼                           ▼
  Meter ─────┘      Tariff               DisconnectionOrder
                                              │
  Zone ──► Route ──► (assigned to Connection) │
                                         PaymentPlan
  User ──► AuditLog
  Notification ──► (triggered by Bill, Payment, Disconnection events)
```

---

## 2. Getting Started

```bash
# Backend (project root)
npm install
cp .env.example .env          # fill in DB credentials, JWT secrets
npm run migrate               # run PostgreSQL migrations
npm run seed                  # optional: load demo data
npm run dev                   # start with auto-reload (port 3000)

# Frontend (client/)
cd client
npm install
npm run dev                   # Vite dev server (port 5173)

# Production build
cd client && npm run build    # outputs to client/dist/
npm start                     # serve backend
```

| Environment | Backend URL | Frontend URL |
|---|---|---|
| Development | `http://localhost:3000/api/v1` | `http://localhost:5173` |
| Production  | `https://api.rumawasco.nexusiot.xyz/api/v1` | `https://app.rumawasco.nexusiot.xyz` |

---

## 3. Authentication

JWT Bearer token authentication. All endpoints except `/health`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, and `/payments/mpesa/callback` require a valid token.

```
POST /auth/login  ──►  { token, refreshToken }
                              │
           Authorization: Bearer <token>   (every request)
                              │
              token expires 8h ──► POST /auth/refresh
```

**Header format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Demo accounts (development only):**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@rumawasco.go.ke` | `password` |
| Manager | `manager@rumawasco.go.ke` | `password` |
| Billing Officer | `billing@rumawasco.go.ke` | `password` |
| Meter Reader | `reader@rumawasco.go.ke` | `password` |
| Customer Service | `customer.service@rumawasco.go.ke` | `password` |
| Customer | `customer@rumawasco.go.ke` | `password` |

---

## 4. Standard Response Format

```jsonc
// Success — single record
{ "success": true, "message": "Customer fetched", "data": { ... } }

// Success — list with pagination
{
  "success": true,
  "message": "Customers fetched",
  "data": [ ... ],
  "pagination": { "page": 1, "pageSize": 20, "total": 154, "totalPages": 8 }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": { "email": "must be a valid email" }
}
```

---

## 5. Error Codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `202` | Accepted (async job queued) |
| `400` | Bad request / validation error |
| `401` | Missing or invalid JWT |
| `403` | Insufficient role |
| `404` | Resource not found |
| `409` | Conflict (duplicate record) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## 6. Pagination & Filtering

All list endpoints support these query parameters:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number (1-based) |
| `pageSize` | int | `20` | Records per page (max 100) |
| `search` | string | — | Full-text search |
| `status` | string | — | Filter by status enum |
| `from` | date | — | Start date filter (ISO 8601) |
| `to` | date | — | End date filter (ISO 8601) |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | `asc`\|`desc` | `desc` | Sort direction |

---

## 7. Role-Based Access Control

| Level | Role | Key Capabilities |
|---|---|---|
| L1 | `super_admin` | All tenants, all operations |
| L2 | `tenant_admin` | Full access within tenant |
| L2 | `manager` | Full operational access |
| L3 | `finance_manager` | Billing, payments, reports |
| L4 | `billing_officer` | Generate bills, record payments |
| L5 | `customer_service` | View all, handle complaints/comms |
| L6 | `metering_supervisor` | Meters, readings, inventory |
| L7 | `meter_reader` | Capture readings, basic meter view |
| L8 | `accountant` | Payments, reconciliation, reports |
| L9 | `auditor` | Read-only across all modules |
| L10 | `customer` | Own bills, payments, receipts only |

Role is encoded in the JWT. `tenantId` scopes all data — cross-tenant access requires `super_admin`.

---

## 8. Endpoints

---

### Health

#### `GET /health`
Public. No authentication required.

```json
{ "success": true, "message": "RUMAWASCO API is running", "version": "1.0.0", "env": "development" }
```

---

### Auth

#### `POST /auth/login`
```json
// Request
{ "email": "admin@rumawasco.go.ke", "password": "password" }

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 28800,
    "user": { "id": "u1", "tenantId": "t1", "name": "Admin User", "email": "admin@rumawasco.go.ke", "role": "tenant_admin" }
  }
}
```

#### `POST /auth/refresh`
```json
// Request
{ "refreshToken": "eyJ..." }
// Response 200
{ "success": true, "data": { "token": "eyJ...", "expiresIn": 28800 } }
```

#### `POST /auth/logout`
🔒 Any role. Invalidates refresh token server-side. Response `200`.

#### `GET /auth/me`
🔒 Any role. Returns current user profile.

```json
{
  "success": true,
  "data": { "id": "u1", "tenantId": "t1", "name": "Admin User", "email": "admin@rumawasco.go.ke",
            "role": "tenant_admin", "status": "active", "lastLogin": "2026-08-17T08:30:00.000Z" }
}
```

#### `PUT /auth/change-password`
🔒 Any role.
```json
{ "currentPassword": "old", "newPassword": "new_secure_password_min_8" }
```

#### `POST /auth/forgot-password`
Public. Sends reset link to email if account exists.
```json
{ "email": "user@rumawasco.go.ke" }
```

#### `POST /auth/reset-password`
Public. Complete password reset.
```json
{ "token": "reset_token_from_email_link", "password": "new_secure_password" }
```

---

### Customers

🔒 Read: L2–L9. Write: L2–L4. Delete: L1–L2.

#### `GET /customers`
**Query:** `page`, `pageSize`, `search`, `status`, `customerType`, `zoneId`

**Customer types:** `residential` | `commercial` | `industrial` | `institutional` | `government` | `bulk`  
**Status:** `active` | `inactive` | `suspended`

```json
{
  "success": true,
  "data": [{
    "id": "c1", "tenantId": "t1", "customerNumber": "CUST-001234",
    "name": "Alice Kamau", "email": "alice@example.com", "phone": "+254 712 345 678",
    "customerType": "residential", "idType": "national_id", "idNumber": "12345678",
    "status": "active", "address": "Plot 12, Kerugoya Town", "zoneId": "z1",
    "activeConnections": 1, "outstandingBalance": 1313, "createdAt": "2024-01-10T00:00:00.000Z"
  }],
  "pagination": { "page": 1, "pageSize": 20, "total": 87, "totalPages": 5 }
}
```

#### `GET /customers/:id`
Returns customer with connections, bills summary, and communications history.

#### `POST /customers`
🔒 L2–L4.
```json
{
  "name": "John Mwangi", "phone": "+254 712 000 100", "email": "john@example.com",
  "customerType": "residential",
  "idType": "national_id",
  "idNumber": "12345678",
  "address": "Plot 5, Kutus Town",
  "zoneId": "z2",
  "companyName": "",
  "notes": ""
}
```
Response `201` — includes auto-generated `customerNumber`.

#### `PUT /customers/:id`
🔒 L2–L4. Partial update — send only fields to change.

#### `DELETE /customers/:id`
🔒 L1–L2. Soft-delete (sets `deletedAt`).

#### `POST /customers/:id/suspend`
🔒 L2–L3. `{ "reason": "Non-payment" }`

#### `POST /customers/:id/activate`
🔒 L2–L3. Reactivate a suspended customer.

#### `GET /customers/:id/bills`
🔒 Customer sees own only. Staff sees any.  
**Query:** `page`, `pageSize`, `status`

#### `GET /customers/:id/payments`
🔒 Customer sees own only. Staff sees any.

#### `GET /customers/:id/communications`
🔒 L2–L5. Returns SMS, email, call, and in-person interaction logs.

---

### Properties

🔒 Read: L2–L9. Write: L2–L4.

#### `GET /properties`
**Query:** `page`, `pageSize`, `search`, `propertyType`, `connectionStatus`, `zoneId`

**Property types:** `residential` | `commercial` | `industrial` | `institutional`  
**Connection status:** `connected` | `not_connected` | `disconnected`

#### `GET /properties/:id`
Returns property with linked customer, meter, and connection details.

#### `POST /properties`
```json
{
  "customerId": "c1",
  "zoneId": "z1",
  "address": "Plot 12, Kerugoya Town",
  "propertyType": "residential",
  "unitNumber": "A1",
  "plotNumber": "LR/KRG/001",
  "ownerPhone": "+254 712 345 678",
  "occupantName": "Alice Kamau",
  "occupantPhone": "+254 712 345 678",
  "notes": ""
}
```

#### `PUT /properties/:id`
Partial update.

#### `POST /properties/:id/activate`
#### `POST /properties/:id/deactivate`

---

### Connections

A Connection is the billable service record linking Customer → Property → Meter → Tariff. It carries the Account Number used for all billing and payment.

🔒 Read: L2–L9. Write: L2–L4.

#### `GET /connections`
**Query:** `page`, `pageSize`, `search`, `status`, `zoneId`, `routeId`, `customerId`, `connectionType`

**Status:** `active` | `inactive` | `suspended` | `disconnected`  
**Types:** `residential` | `commercial` | `industrial` | `institutional` | `government` | `bulk`

```json
{
  "success": true,
  "data": [{
    "id": "cn1", "tenantId": "t1", "accountNumber": "ACC-001234",
    "customerId": "c1", "customerName": "Alice Kamau",
    "meterId": "m1", "meterNumber": "MTR-2024-0001",
    "tariffId": "tar1", "tariffName": "Residential IBT",
    "zoneId": "z1", "zoneName": "KRG — Kerugoya Town",
    "routeId": "r1", "routeCode": "KRG-01",
    "connectionType": "residential",
    "status": "active", "deposit": 2000,
    "connectedAt": "2024-01-10", "lastBilledAt": "2026-08-01",
    "outstandingBalance": 1313, "createdAt": "2024-01-10T00:00:00.000Z"
  }]
}
```

#### `GET /connections/:id`
Full detail with meter, tariff, billing history, and latest reading.

#### `POST /connections`
🔒 L2–L4.
```json
{
  "customerId": "c1",
  "propertyId": "p1",
  "meterId": "m3",
  "tariffId": "tar1",
  "zoneId": "z1",
  "routeId": "r2",
  "connectionType": "residential",
  "deposit": 2000,
  "connectedAt": "2026-08-01"
}
```
Response `201` — includes auto-generated `accountNumber` (format: `ACC-XXXXXX`).

#### `PUT /connections/:id`
🔒 L2–L3. Update tariff, route, or address.

#### `POST /connections/:id/suspend`
🔒 L2–L3. `{ "reason": "Arrears exceed KES 5,000" }`

#### `POST /connections/:id/activate`
🔒 L2–L3.

#### `POST /connections/:id/disconnect`
🔒 L2–L3. Permanently disconnects — triggers DisconnectionOrder creation.

---

### Meters

🔒 Read: L2–L9. Write: L2, L6. Retire: L2, L3, L6.

#### `GET /meters`
**Query:** `page`, `pageSize`, `search`, `status`, `type`, `zoneId`, `unassigned`

**Status:** `active` | `inactive` | `faulty` | `replaced` | `removed` | `tampered` | `disconnected`  
**Type:** `mechanical` | `digital` | `smart_iot`

#### `GET /meters/:id`
Full detail with MeterEvents history and recent readings.

#### `POST /meters`
🔒 L2, L6.
```json
{
  "meterNumber": "MTR-2026-0042",
  "serialNumber": "SN-987654",
  "brand": "Itron",
  "model": "Cyble 5",
  "type": "digital",
  "size": "15mm",
  "propertyId": "p1",
  "customerId": "c1",
  "zoneId": "z1",
  "routeId": "r2",
  "installationLocation": "Main gate, facing road",
  "initialReading": 0,
  "installDate": "2026-08-15",
  "notes": ""
}
```

#### `PUT /meters/:id`
🔒 L2, L6.

#### `POST /meters/:id/retire`
🔒 L2, L3, L6.
```json
{ "reason": "Faulty — meter replaced", "replacedById": "m45" }
```

#### `POST /meters/:id/event`
🔒 L2, L6, L7. Log a meter lifecycle event.
```json
{
  "eventType": "calibration",
  "description": "Annual calibration completed — within tolerance",
  "performedBy": "John Reader",
  "notes": ""
}
```
**Event types:** `calibration` | `inspection` | `fault_reported` | `tampering_detected` | `removal` | `note`

#### `POST /meters/:id/assign`
🔒 L2, L6. Assign meter to a property/customer.
```json
{ "propertyId": "p2", "customerId": "c3", "installationLocation": "Kitchen wall" }
```

---

### Meter Readings

🔒 Read: L2–L9. Create: L7, L6, L2–L4. Approve/Reject: L6, L2–L3.

#### `GET /meter-readings`
**Query:** `page`, `pageSize`, `search`, `meterId`, `zoneId`, `routeId`, `readerId`, `status`, `readingType`, `from`, `to`, `flagged`

**Reading type:** `manual` | `iot` | `estimated`  
**Status:** `pending` | `validated` | `rejected`

#### `GET /meter-readings/:id`

#### `POST /meter-readings`
🔒 L7, L6, L2–L4.
```json
{
  "meterId": "m1",
  "connectionId": "cn1",
  "currentReading": 1452,
  "readingDate": "2026-08-15",
  "readingType": "manual",
  "imageUrl": "https://uploads.rumawasco.go.ke/readings/img_001.jpg",
  "notes": "Meter accessible. Clear reading."
}
```
Response `201` — includes computed `unitsConsumed` (currentReading − previousReading).  
Auto-flags if: negative consumption, consumption > 150 m³, or > 3× typical monthly usage.

#### `POST /meter-readings/bulk`
🔒 L6, L2–L3. Upload entire route's readings at once.
```json
{
  "routeId": "r1",
  "readingDate": "2026-08-15",
  "readings": [
    { "meterId": "m1", "currentReading": 1452, "notes": "" },
    { "meterId": "m2", "currentReading": 872,  "notes": "Meter partially obscured" }
  ]
}
```

#### `POST /meter-readings/:id/approve`
🔒 L6, L2–L3. Validates reading — makes it eligible for billing.

#### `POST /meter-readings/:id/reject`
🔒 L6, L2–L3.
```json
{ "reason": "Image unclear — meter not readable. Please revisit." }
```

---

### Billing / Invoices

Bills are generated from validated meter readings. The IBT (Increasing Block Tariff) calculation is applied per the assigned tariff.

🔒 Read: L2–L9. Generate: L2–L4. Void: L2–L3. Send: L2–L4.

#### `GET /invoices`
**Query:** `page`, `pageSize`, `search`, `status`, `customerId`, `connectionId`, `billingPeriodId`, `from`, `to`

**Status:** `draft` | `issued` | `paid` | `partial` | `overdue` | `cancelled`

#### `GET /invoices/:id`
Full bill with line items:
```json
{
  "success": true,
  "data": {
    "id": "b1", "billNumber": "INV-2026-001",
    "customerId": "c1", "customerName": "Alice Kamau",
    "connectionId": "cn1", "accountNumber": "ACC-001234",
    "billingPeriodStart": "2026-08-01", "billingPeriodEnd": "2026-08-31",
    "previousReading": 1234, "currentReading": 1252, "unitsConsumed": 18,
    "lineItems": [
      { "description": "Water Charge (Block 1: 0–6 m³ @ KES 60)", "amount": 360 },
      { "description": "Water Charge (Block 2: 7–18 m³ @ KES 90)", "amount": 1080 },
      { "description": "Standing Charge", "amount": 200 },
      { "description": "Sewerage Levy (15%)", "amount": 216 },
      { "description": "VAT (16%)", "amount": 0 },
      { "description": "Arrears B/F", "amount": 0 }
    ],
    "subtotal": 1856, "discount": 0, "penalty": 0, "totalAmount": 1856,
    "amountPaid": 543, "balance": 1313,
    "dueDate": "2026-08-21", "status": "partial",
    "issuedAt": "2026-08-01T09:00:00.000Z"
  }
}
```

#### `POST /invoices/generate`
🔒 L2–L4. Generate a single bill.
```json
{
  "connectionId": "cn1",
  "billingPeriodStart": "2026-08-01",
  "billingPeriodEnd": "2026-08-31",
  "currentReading": 1452,
  "dueDate": "2026-08-21",
  "discountPercent": 0,
  "penaltyAmount": 0,
  "notes": ""
}
```
Response `201` — fully calculated bill with IBT tariff line items.

#### `POST /invoices/bulk-generate`
🔒 L2–L3. Generate for all active connections in a period. Runs asynchronously.
```json
{
  "billingPeriodStart": "2026-08-01",
  "billingPeriodEnd": "2026-08-31",
  "dueDate": "2026-08-21",
  "zoneId": "z1"
}
```
Response `202` — `{ "jobId": "job_abc123", "message": "Bulk billing queued for 1,189 connections" }`

#### `POST /invoices/:id/void`
🔒 L2–L3.
```json
{ "reason": "Incorrect reading — re-bill will be issued" }
```

#### `POST /invoices/:id/send`
🔒 L2–L4. Delivers bill to customer via SMS and/or email.

#### `GET /invoices/:id/pdf`
Returns binary PDF.
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="INV-2026-001.pdf"
```

---

### Billing Periods

Billing cycles that group readings and bill runs.

🔒 Read: L2–L9. Write: L2–L3.

#### `GET /billing-periods`
**Query:** `page`, `pageSize`, `status`

**Status:** `scheduled` | `reading` | `billing` | `completed` | `cancelled`

#### `GET /billing-periods/:id`

#### `POST /billing-periods`
```json
{
  "name": "August 2026",
  "cycleType": "monthly",
  "readingPeriodStart": "2026-08-01",
  "readingPeriodEnd": "2026-08-15",
  "billingDate": "2026-08-16",
  "dueDate": "2026-08-31",
  "notes": ""
}
```
**Cycle types:** `monthly` | `bi_monthly` | `quarterly`

#### `PUT /billing-periods/:id`
#### `POST /billing-periods/:id/generate-bills`
🔒 L2–L4. Triggers bulk bill generation for the period.

---

### Tariffs

IBT (Increasing Block Tariff) pricing structures assigned to connections.

🔒 Read: L2–L9. Write: L2–L3. Deactivate: L1–L2.

#### `GET /tariffs`
**Query:** `page`, `pageSize`, `status`, `connectionType`

#### `GET /tariffs/:id`
```json
{
  "success": true,
  "data": {
    "id": "tar1", "name": "Residential IBT",
    "description": "Standard residential tariff — IBT 4 blocks",
    "connectionType": "residential",
    "billingCycle": "monthly",
    "standingCharge": 200,
    "minimumCharge": 300,
    "penaltyRate": 2,
    "blocks": [
      { "fromUnits": 0,  "toUnits": 6,   "ratePerUnit": 60  },
      { "fromUnits": 7,  "toUnits": 20,  "ratePerUnit": 90  },
      { "fromUnits": 21, "toUnits": 50,  "ratePerUnit": 130 },
      { "fromUnits": 51, "toUnits": null,"ratePerUnit": 180 }
    ],
    "status": "active", "effectiveDate": "2024-01-01"
  }
}
```

#### `POST /tariffs`
```json
{
  "name": "Commercial IBT",
  "description": "Standard commercial tariff",
  "connectionType": "commercial",
  "billingCycle": "monthly",
  "standingCharge": 500,
  "minimumCharge": 800,
  "penaltyRate": 2,
  "blocks": [
    { "fromUnits": 0,  "toUnits": 10,  "ratePerUnit": 80  },
    { "fromUnits": 11, "toUnits": 50,  "ratePerUnit": 120 },
    { "fromUnits": 51, "toUnits": null,"ratePerUnit": 200 }
  ],
  "effectiveDate": "2026-09-01"
}
```

#### `PUT /tariffs/:id`
#### `POST /tariffs/:id/deactivate`

---

### Payments

🔒 Read: L2–L9. Write: L2–L4. Reverse: L2–L3.

#### `GET /payments`
**Query:** `page`, `pageSize`, `search`, `customerId`, `connectionId`, `method`, `from`, `to`

**Payment methods:** `cash` | `mpesa` | `bank_transfer` | `cheque` | `card` | `other`

#### `GET /payments/:id`
Full payment with allocation breakdown per bill.

#### `POST /payments`
🔒 L2–L4. Record a manual payment.
```json
{
  "connectionId": "cn1",
  "amount": 2500,
  "paymentMethod": "cash",
  "paidAt": "2026-08-17",
  "reference": "CASH-0042",
  "mpesaCode": "",
  "phoneNumber": "",
  "bankName": "",
  "chequeNumber": "",
  "notes": "Paid at counter"
}
```
Response `201` — payment + receipt + updated bill statuses. Bills allocated oldest-first; surplus becomes account credit.

#### `POST /payments/:id/reverse`
🔒 L2–L3. Reverses payment and restores bill statuses.
```json
{ "reason": "Cheque bounced — ref CHQ-0042" }
```

#### `POST /payments/mpesa/stk-push`
🔒 L2–L5. Initiate M-Pesa STK push to customer's phone.
```json
{ "accountNumber": "ACC-001234", "amount": 1313, "phoneNumber": "254712345678" }
```
```json
{
  "success": true,
  "data": {
    "checkoutRequestId": "ws_CO_17082026_...",
    "merchantRequestId": "...",
    "responseDescription": "Success. Request accepted for processing"
  }
}
```

#### `GET /payments/mpesa/query/:checkoutRequestId`
Poll M-Pesa STK push status.

---

### Receipts

🔒 Read: L2–L9. Customers see own receipts only.

#### `GET /receipts`
**Query:** `page`, `pageSize`, `search`, `customerId`, `status`, `from`, `to`

**Status:** `issued` | `printed` | `voided`

#### `GET /receipts/:id`
Full receipt with payment allocation breakdown.

#### `GET /receipts/:id/pdf`
Returns binary PDF receipt.
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="RCT-2026-001.pdf"
```

---

### Arrears & Payment Plans

#### `GET /arrears`
🔒 L2–L9. Returns all accounts with outstanding balance > 0, grouped by aging bucket.

**Query:** `page`, `pageSize`, `search`, `bucket`, `zoneId`, `from`, `to`

**Aging buckets:** `current` | `1_30` | `31_60` | `61_90` | `over_90`

```json
{
  "success": true,
  "data": {
    "summary": { "current": 620000, "1_30": 420000, "31_60": 185000, "61_90": 94000, "over_90": 62000, "total": 1381000 },
    "accounts": [
      { "customerId": "c5", "customerName": "David Mwangi", "accountNumber": "ACC-001238",
        "balance": 8900, "oldestBillDate": "2026-05-01", "daysOverdue": 108, "bucket": "over_90" }
    ]
  }
}
```

#### `GET /payment-plans`
🔒 L2–L9. **Query:** `page`, `pageSize`, `customerId`, `status`

#### `GET /payment-plans/:id`

#### `POST /payment-plans`
🔒 L2–L4. Create installment agreement.
```json
{
  "customerId": "c5",
  "connectionId": "cn5",
  "billIds": ["b8", "b9"],
  "totalAmount": 8900,
  "installments": 3,
  "startDate": "2026-09-01",
  "notes": "Customer committed to 3-month plan"
}
```
Response `201` — plan with computed installment schedule (amounts + due dates).

#### `PUT /payment-plans/:id`
#### `POST /payment-plans/:id/cancel`
```json
{ "reason": "Customer defaulted" }
```

---

### Disconnections

Workflow-driven credit control process.

🔒 Read: L2–L9. Write: L2–L5. Approve: L2–L3. Execute: L2–L3, field team.

**Lifecycle:**
```
pending_reminder → reminder_sent → notice_issued → pending_approval
→ approved → disconnected → reconnection_requested → reconnection_approved → reconnected
```
or any stage → `cancelled`

#### `GET /disconnections`
**Query:** `page`, `pageSize`, `search`, `status`, `zoneId`, `from`, `to`

#### `GET /disconnections/:id`
Full detail with audit trail of all status transitions.

#### `POST /disconnections`
🔒 L2–L4. Create disconnection order.
```json
{
  "connectionId": "cn5",
  "reason": "Outstanding balance KES 8,900 unpaid for 90+ days",
  "daysOverdue": 108,
  "balance": 8900
}
```

#### `POST /disconnections/:id/send-reminder`
🔒 L2–L5. `{ "notes": "" }`

#### `POST /disconnections/:id/issue-notice`
🔒 L2–L4. `{ "notes": "" }`

#### `POST /disconnections/:id/submit-approval`
🔒 L2–L4. `{ "notes": "" }`

#### `POST /disconnections/:id/approve`
🔒 L2–L3. `{ "notes": "" }`

#### `POST /disconnections/:id/execute`
🔒 L2–L3. Mark physically disconnected.
```json
{ "disconnectedAt": "2026-08-17", "performedBy": "Field Team A", "notes": "" }
```

#### `POST /disconnections/:id/request-reconnection`
🔒 L2–L5. After payment, request reconnection.
```json
{ "amountPaid": 8900, "paymentReference": "RCT-2026-015", "notes": "" }
```

#### `POST /disconnections/:id/approve-reconnection`
🔒 L2–L3. `{ "notes": "" }`

#### `POST /disconnections/:id/mark-reconnected`
🔒 L2–L3.
```json
{ "reconnectedAt": "2026-08-19", "performedBy": "Field Team A", "notes": "" }
```

#### `POST /disconnections/:id/cancel`
🔒 L2–L3. `{ "reason": "Customer paid in full" }`

---

### Zones & Routes

🔒 Read: L2–L9. Write: L2–L3.

#### `GET /zones`
**Query:** `page`, `pageSize`, `subCounty`, `status`

```json
{
  "success": true,
  "data": [{
    "id": "z1", "code": "KRG", "name": "Kerugoya Town",
    "subCounty": "Kirinyaga Central",
    "totalConnections": 320, "activeConnections": 301, "routeCount": 3,
    "area": 12.4, "status": "active"
  }]
}
```

#### `GET /zones/:id`
Zone detail with all associated routes.

#### `POST /zones`
```json
{ "code": "KRG", "name": "Kerugoya Town", "subCounty": "Kirinyaga Central", "description": "", "area": 12.4 }
```

#### `PUT /zones/:id`
#### `POST /zones/:id/deactivate`

#### `GET /zones/:id/routes`
All meter routes within a zone.

#### `GET /routes`
**Query:** `page`, `pageSize`, `zoneId`, `readerId`, `status`

#### `GET /routes/:id`

#### `POST /routes`
```json
{
  "zoneId": "z1",
  "routeCode": "KRG-04",
  "name": "Kerugoya Route 4 — Industrial Area",
  "description": "",
  "readerId": "u4"
}
```

#### `PUT /routes/:id`
#### `POST /routes/:id/assign-reader`
```json
{ "readerId": "u4" }
```

---

### Reports & Analytics

🔒 L2–L9.

#### `GET /reports/dashboard`
Real-time KPI cards for management dashboard.

```json
{
  "success": true,
  "data": {
    "totalCustomers": 1247,
    "activeConnections": 1189,
    "totalBilled": 9842600,
    "totalCollected": 8600000,
    "outstanding": 1242600,
    "collectionRate": 87.4,
    "metersRead": 1145,
    "pendingReadings": 44,
    "overdueAccounts": 87,
    "newCustomersThisMonth": 14,
    "disconnectionOrders": 12,
    "paymentPlansActive": 8
  }
}
```

#### `GET /reports/revenue-trend`
Monthly billed vs collected vs outstanding.  
**Query:** `months` (default `6`, max `24`)
```json
{ "data": [{ "month": "Aug 2026", "revenue": 1210000, "collected": 1060000, "outstanding": 150000 }] }
```

#### `GET /reports/consumption-trend`
Monthly water consumption in m³.  
**Query:** `months` (default `6`, max `24`), `zoneId`

#### `GET /reports/revenue-by-zone`
Revenue breakdown per zone.

#### `GET /reports/revenue-by-customer-type`
Revenue breakdown by customer type.

#### `GET /reports/consumption-by-zone`
Consumption breakdown per zone.

#### `GET /reports/high-consumers`
**Query:** `limit` (default `10`), `period`

#### `GET /reports/aging`
Debt aging analysis.
```json
{ "data": [
  { "band": "Current (0 days)", "accounts": 68, "amount": 620000 },
  { "band": "1–30 days",        "accounts": 48, "amount": 420000 },
  { "band": "31–60 days",       "accounts": 22, "amount": 185000 },
  { "band": "61–90 days",       "accounts": 11, "amount": 94000  },
  { "band": "90+ days",         "accounts": 8,  "amount": 62000  }
]}
```

#### `GET /reports/collection-rate`
**Query:** `from`, `to`, `zoneId`

#### `GET /reports/meter-stats`
Meter status counts — total, active, faulty, pending, removed, estimated reads, flagged reads.

#### `GET /reports/billing-summary/export`
**Query:** `format` (`xls` | `csv`), `from`, `to`, `zoneId`  
Returns binary file (styled Excel or CSV).

#### `GET /reports/consumption/export`
**Query:** `format`, `from`, `to`, `zoneId`

#### `GET /reports/revenue/export`
**Query:** `format`, `from`, `to`

#### `GET /reports/meters/export`
**Query:** `format`, `status`, `zoneId`

---

### Notifications

#### `GET /notifications`
🔒 Any role. Customers see own; staff see all.  
**Query:** `page`, `pageSize`, `type`, `status`, `customerId`, `from`, `to`

**Types:** `sms` | `email` | `push` | `whatsapp`  
**Status:** `pending` | `sent` | `delivered` | `failed`

#### `POST /notifications/send`
🔒 L2–L5. Send manual message to a customer.
```json
{
  "customerId": "c1",
  "type": "sms",
  "subject": "Payment Reminder",
  "message": "Dear Alice Kamau, your bill INV-2026-001 of KES 1,313 is due 21 Aug 2026. Pay via M-Pesa Paybill 247247, Acc: ACC-001234."
}
```

#### `GET /notifications/templates`
🔒 L2–L3. List notification templates.

#### `POST /notifications/templates`
🔒 L2–L3. Create template.
```json
{
  "name": "Bill Notification",
  "type": "sms",
  "event": "bill_generated",
  "subject": "New Water Bill",
  "body": "Dear {{customerName}}, your bill {{billNumber}} of {{amount}} is due {{dueDate}}. Pay via M-Pesa Paybill 247247, Acc: {{accountNumber}}."
}
```

#### `PUT /notifications/templates/:id`

#### `GET /notifications/channels`
🔒 L2–L3. Returns configured channel status (SMS, Email, Push, WhatsApp).

#### `PUT /notifications/channels/:channel`
🔒 L1–L2. Update channel configuration.

---

### Inventory & Assets

🔒 Read: L2–L9. Write: L2, L6.

#### `GET /inventory`
**Query:** `page`, `pageSize`, `search`, `category`, `status`

**Categories:** `meter` | `pipe` | `fitting` | `valve` | `pump` | `chemical` | `tool` | `vehicle` | `other`

#### `GET /inventory/:id`
#### `POST /inventory`
```json
{
  "itemCode": "ITM-001",
  "name": "15mm Digital Water Meter",
  "category": "meter",
  "unit": "piece",
  "quantityInStock": 50,
  "reorderLevel": 10,
  "unitCost": 3500,
  "supplier": "Itron Kenya",
  "notes": ""
}
```
#### `PUT /inventory/:id`
#### `POST /inventory/:id/adjust`
🔒 L2, L6. Adjust stock level.
```json
{ "adjustment": -5, "reason": "Issued to field team — batch MTR-2026-0038 to MTR-2026-0042" }
```

#### `GET /assets`
**Query:** `page`, `pageSize`, `search`, `category`, `status`

#### `GET /assets/:id`
#### `POST /assets`
```json
{
  "assetCode": "AST-001",
  "name": "Service Vehicle",
  "category": "vehicle",
  "serialNumber": "KDB 123A",
  "purchaseDate": "2022-03-01",
  "purchasePrice": 1800000,
  "status": "active",
  "location": "Main Depot",
  "notes": ""
}
```
#### `PUT /assets/:id`

#### `GET /maintenance-records`
**Query:** `page`, `pageSize`, `assetId`

#### `POST /maintenance-records`
```json
{
  "assetId": "ast1",
  "type": "preventive",
  "description": "Oil change and tyre rotation",
  "cost": 12500,
  "performedBy": "Mwangi Garage",
  "performedAt": "2026-08-15",
  "nextServiceDate": "2026-11-15"
}
```

---

### Service Requests & Complaints

#### `GET /service-requests`
🔒 L2–L9. **Query:** `page`, `pageSize`, `status`, `type`, `customerId`, `assignedTo`

**Types:** `new_connection` | `meter_fault` | `pipe_leakage` | `low_pressure` | `billing_query` | `reconnection` | `other`  
**Status:** `open` | `assigned` | `in_progress` | `resolved` | `closed` | `cancelled`

#### `GET /service-requests/:id`
#### `POST /service-requests`
```json
{
  "customerId": "c7",
  "type": "pipe_leakage",
  "title": "Pipe leakage at main gate",
  "description": "Water leaking from the meter connection pipe since 12 Aug 2026",
  "priority": "high",
  "propertyId": "p7"
}
```

#### `PUT /service-requests/:id`
#### `POST /service-requests/:id/assign`
🔒 L2–L5. `{ "assignedTo": "u4", "notes": "" }`

#### `POST /service-requests/:id/resolve`
🔒 L2–L6. `{ "resolution": "Replaced faulty coupling. No further leakage.", "resolvedAt": "2026-08-13" }`

#### `POST /service-requests/:id/close`
#### `GET /complaints`
**Query:** `page`, `pageSize`, `status`, `customerId`

#### `GET /complaints/:id`
#### `POST /complaints`
```json
{
  "customerId": "c3",
  "subject": "High bill query",
  "description": "Bill for July 2026 is unusually high compared to previous months",
  "priority": "medium"
}
```
#### `PUT /complaints/:id`
#### `POST /complaints/:id/resolve`
```json
{ "resolution": "Reviewed readings — consumption was higher due to leaking tank. Customer acknowledged." }
```

---

### Users & Access

🔒 Read: L1–L2. Write: L1–L2. Deactivate: L1–L2.

#### `GET /users`
**Query:** `page`, `pageSize`, `search`, `role`, `status`

#### `GET /users/:id`

#### `POST /users`
🔒 L1–L2.
```json
{
  "name": "Sarah Wanjiru",
  "email": "sarah@rumawasco.go.ke",
  "phone": "+254 712 000 010",
  "role": "billing_officer",
  "password": "temp_password_change_on_first_login",
  "zoneIds": ["z1", "z2"]
}
```

#### `PUT /users/:id`
🔒 L1–L2.

#### `POST /users/:id/deactivate`
🔒 L1–L2. `{ "reason": "" }`

#### `POST /users/:id/activate`
🔒 L1–L2.

#### `PUT /users/:id/role`
🔒 L1–L2.
```json
{ "role": "manager", "reason": "Promotion" }
```

#### `POST /users/:id/reset-password`
🔒 L1–L2. Forces password reset email.

#### `GET /users/:id/login-history`
🔒 L1–L2.

---

### Audit Logs

🔒 Read: L1–L3, L9.

#### `GET /audit-logs`
**Query:** `page`, `pageSize`, `userId`, `resource`, `action`, `from`, `to`, `tenantId`

```json
{
  "success": true,
  "data": [{
    "id": "al1", "tenantId": "t1",
    "userId": "u1", "userName": "Admin User", "userRole": "tenant_admin",
    "action": "create", "resource": "Customer", "resourceId": "c12",
    "description": "Created customer record for John Mwangi",
    "ipAddress": "41.89.64.10",
    "createdAt": "2026-08-17T09:15:00.000Z"
  }]
}
```

#### `GET /audit-logs/export`
**Query:** `format` (`xls` | `csv`), `from`, `to`, `userId`, `resource`

---

### Settings

🔒 Read: L2–L3. Write: L1–L2.

#### `GET /settings`
Returns all tenant settings (organisation, billing, notifications, integrations).

```json
{
  "success": true,
  "data": {
    "organisation": { "name": "RUMAWASCO", "logo": "...", "address": "...", "phone": "...", "email": "...", "website": "..." },
    "billing": { "defaultDueDays": 21, "penaltyRate": 2, "gracePeriodDays": 7, "vatRate": 0, "sewerageRate": 15 },
    "notifications": { "smsEnabled": true, "emailEnabled": true, "billDelivery": "both" },
    "mpesa": { "shortcode": "247247", "env": "production" }
  }
}
```

#### `PUT /settings/organisation`
#### `PUT /settings/billing`
#### `PUT /settings/notifications`
#### `PUT /settings/integrations`

---

### Customer Portal

Self-service endpoints for `customer` role — data scoped to own `customerId` only.

🔒 L10 (customer) only.

#### `GET /portal/overview`
Account summary for the logged-in customer.
```json
{
  "success": true,
  "data": {
    "customerNumber": "CUST-001234",
    "name": "Alice Kamau",
    "accountNumber": "ACC-001234",
    "meterNumber": "MTR-2024-0001",
    "currentReading": 1452,
    "lastReadingDate": "2026-08-15",
    "lastBillAmount": 1313,
    "lastBillDate": "2026-08-01",
    "outstandingBalance": 1313,
    "connectionStatus": "active"
  }
}
```

#### `GET /portal/bills`
Own bills only. **Query:** `page`, `pageSize`, `status`

#### `GET /portal/bills/:id`
Own bill detail.

#### `GET /portal/bills/:id/pdf`
Download own bill PDF.

#### `GET /portal/payments`
Own payment history. **Query:** `page`, `pageSize`

#### `GET /portal/receipts`
Own receipts. **Query:** `page`, `pageSize`

#### `GET /portal/receipts/:id/pdf`
Download own receipt PDF.

#### `GET /portal/consumption`
Own consumption trend (last 12 months).

#### `GET /portal/notifications`
Own notification history (SMS, email).

---

## 9. Webhooks — M-Pesa Callback

Safaricom Daraja POSTs C2B and STK push results to this public endpoint.  
**No JWT required** — Safaricom cannot send auth headers.

#### `POST /payments/mpesa/callback`

Set in `.env`:
```
MPESA_CALLBACK_URL=https://api.rumawasco.nexusiot.xyz/api/v1/payments/mpesa/callback
```

**Processing sequence:**
1. Validate Safaricom IP range whitelist
2. Parse `BillRefNumber` (= account number) or `CheckoutRequestID`
3. Match to active connection
4. Record payment to `payments` table
5. Allocate across outstanding bills (oldest first)
6. Generate receipt
7. Update bill statuses
8. Send confirmation SMS to customer
9. Log to audit trail

**Safaricom payload example:**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "...",
      "CheckoutRequestID": "ws_CO_...",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount",              "Value": 1313 },
          { "Name": "MpesaReceiptNumber",  "Value": "RKX8A12345" },
          { "Name": "PhoneNumber",         "Value": 254712345678 }
        ]
      }
    }
  }
}
```

---

## 10. Scheduled Jobs (Cron)

These run automatically via `node-cron` — no API call needed.

| Job | Schedule | Action |
|---|---|---|
| Auto billing | `0 8 1 * *` (1st of month, 08:00) | `POST /invoices/bulk-generate` for all active connections |
| Overdue detection | `0 7 * * *` (daily, 07:00) | Marks bills past due date as `overdue`; queues reminder SMS |
| Payment plan reminders | `0 8 * * *` (daily, 08:00) | Sends reminder SMS for installments due within 3 days |
| IoT reading ingestion | `*/15 * * * *` (every 15 min) | Polls registered IoT gateways for new smart meter readings |

Configure schedule in `.env`:
```
BILLING_CRON=0 8 1 * *
OVERDUE_CRON=0 7 * * *
```

---

## 11. Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | — | `development` \| `test` \| `production` |
| `PORT` | Yes | `3000` | Server port |
| `API_PREFIX` | No | `/api/v1` | API path prefix |
| `DB_HOST` | Yes | — | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | — | Database name |
| `DB_USER` | Yes | — | Database user |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_POOL_MIN` | No | `2` | Connection pool minimum |
| `DB_POOL_MAX` | No | `10` | Connection pool maximum |
| `JWT_SECRET` | Yes | — | Min 64 random chars |
| `JWT_EXPIRES_IN` | No | `8h` | Access token lifetime |
| `JWT_REFRESH_SECRET` | Yes | — | Min 64 random chars (different) |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `ALLOWED_ORIGINS` | Yes | — | Comma-separated CORS origins |
| `MPESA_CONSUMER_KEY` | M-Pesa | — | Safaricom Daraja consumer key |
| `MPESA_CONSUMER_SECRET` | M-Pesa | — | Safaricom Daraja consumer secret |
| `MPESA_PASSKEY` | M-Pesa | — | Lipa na M-Pesa online passkey |
| `MPESA_SHORTCODE` | M-Pesa | — | Paybill number (e.g. `247247`) |
| `MPESA_CALLBACK_URL` | M-Pesa | — | Public HTTPS URL for Daraja callbacks |
| `MPESA_ENV` | M-Pesa | `sandbox` | `sandbox` \| `production` |
| `SMTP_HOST` | Email | — | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | Email | `587` | SMTP port |
| `SMTP_SECURE` | Email | `false` | TLS: `true` for port 465 |
| `SMTP_USER` | Email | — | SMTP login |
| `SMTP_PASS` | Email | — | SMTP password / app password |
| `EMAIL_FROM` | Email | — | `"RUMAWASCO <noreply@rumawasco.go.ke>"` |
| `SMS_API_KEY` | SMS | — | Africa's Talking API key |
| `SMS_USERNAME` | SMS | `sandbox` | Africa's Talking username |
| `SMS_SENDER_ID` | SMS | — | Registered sender ID |
| `UPLOAD_DIR` | No | `./uploads` | File upload path |
| `MAX_FILE_SIZE_MB` | No | `5` | Max upload size (MB) |
| `LOG_LEVEL` | No | `info` | Winston log level |
| `LOG_DIR` | No | `./logs` | Log file directory |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Max auth requests per window |
| `BILLING_CRON` | No | `0 8 1 * *` | Auto-billing cron expression |
| `OVERDUE_CRON` | No | `0 7 * * *` | Overdue detection cron expression |

---

## 12. Rate Limits

| Endpoint group | Limit | Window |
|---|---|---|
| All `/api/v1` routes | 100 requests | 15 minutes |
| `POST /auth/login` | 10 requests | 15 minutes |
| `POST /auth/forgot-password` | 10 requests | 15 minutes |
| `POST /payments/mpesa/stk-push` | 20 requests | 15 minutes |

**Rate-limited response:**
```json
{ "success": false, "message": "Too many requests, please try again later." }
```
With header: `Retry-After: <seconds>`

---

*Generated for RUMAWASCO Water Billing & Management System — v1.0.0*
