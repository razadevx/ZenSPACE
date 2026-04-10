# AKS DigiRec Backend API

Complete, production-ready backend API for AKS DigiRec - Multi-tenant SaaS ERP for Ceramics Manufacturing.

## Features

- **Multi-tenant Architecture**: Complete company isolation with middleware
- **Double-Entry Accounting**: Full ledger system with automatic posting
- **Inventory Management**: Raw materials, finished goods, processed stock tracking
- **Production Tracking**: Multi-stage production with WIP and loss tracking
- **Worker Management**: Activity tracking, wages calculation, payments
- **Ball Mill/Composition**: Slip preparation with cost calculation
- **Sales & Purchase**: Complete invoicing with payment tracking
- **Cash & Bank Management**: Transaction tracking with reconciliation
- **Comprehensive Reports**: 20+ reports including P&L, Balance Sheet, Aging
- **Bilingual Support**: English/Urdu with database-driven dictionary
- **Role-based Permissions**: Granular access control

## Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Refresh Tokens
- **Security**: Helmet, Rate Limiting, Mongo Sanitization, HPP

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aks-digirec
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
```

### 3. Seed Database

```bash
npm run seed
```

Creates:
- Default roles (super_admin, admin, manager, accountant, operator, viewer)
- Super admin user

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "companyName": "My Ceramics Factory",
  "phone": "+923001234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "admin",
      "company": {
        "id": "...",
        "name": "My Ceramics Factory"
      }
    }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Update Password
```http
PUT /api/auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Users

```http
GET    /api/users?page=1&limit=50&search=john
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
PUT    /api/users/profile/me
GET    /api/users/preferences/me
PUT    /api/users/preferences/me
```

**Create User:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "password123",
  "roleId": "role_id_here",
  "phone": "+923001234568"
}
```

### Companies

```http
GET    /api/companies                    # Super Admin only
POST   /api/companies                    # Super Admin only
GET    /api/companies/my
GET    /api/companies/:id
PUT    /api/companies/:id
PUT    /api/companies/settings/my
PUT    /api/companies/:id/subscription   # Super Admin only
DELETE /api/companies/:id                # Super Admin only
```

### Master Data

#### Sections
```http
GET    /api/master/sections
POST   /api/master/sections
GET    /api/master/sections/:id
PUT    /api/master/sections/:id
DELETE /api/master/sections/:id
```

**Create Section:**
```json
{
  "name": { "en": "Production Line 1", "ur": "پروڈکشن لائن 1" },
  "type": "production",
  "description": { "en": "Main production line", "ur": "مرکزی پروڈکشن لائن" }
}
```

#### Raw Materials
```http
GET    /api/master/raw-materials?page=1&limit=50&search=clay&materialType=id
POST   /api/master/raw-materials
GET    /api/master/raw-materials/:id
PUT    /api/master/raw-materials/:id
DELETE /api/master/raw-materials/:id
```

**Create Raw Material:**
```json
{
  "name": { "en": "White Clay", "ur": "سفید مٹی" },
  "materialType": "material_type_id",
  "unit": "unit_id",
  "inventory": {
    "minLevel": 100,
    "maxLevel": 1000,
    "reorderLevel": 200
  },
  "costing": {
    "method": "AVERAGE",
    "standardCost": 50
  }
}
```

#### Workers
```http
GET    /api/master/workers?page=1&limit=50&search=ahmed&department=id
POST   /api/master/workers
GET    /api/master/workers/:id
PUT    /api/master/workers/:id
DELETE /api/master/workers/:id
```

**Create Worker:**
```json
{
  "firstName": "Ahmed",
  "lastName": "Khan",
  "cnic": "35201-1234567-8",
  "phone": "+923001234567",
  "designation": "Machine Operator",
  "department": "section_id",
  "workerType": "permanent",
  "joinDate": "2024-01-01",
  "wages": {
    "type": "daily",
    "amount": 800,
    "overtimeRate": 100
  }
}
```

#### Suppliers
```http
GET    /api/master/suppliers?page=1&limit=50&search=abc
POST   /api/master/suppliers
GET    /api/master/suppliers/:id
PUT    /api/master/suppliers/:id
DELETE /api/master/suppliers/:id
```

**Create Supplier:**
```json
{
  "businessName": "ABC Materials Ltd",
  "contactPerson": {
    "name": "John Smith",
    "phone": "+923001234567"
  },
  "phone": "+923001234567",
  "email": "contact@abc.com",
  "address": {
    "street": "123 Main St",
    "city": "Lahore",
    "postalCode": "54000"
  },
  "creditTerms": {
    "limit": 500000,
    "days": 30
  }
}
```

#### Customers
```http
GET    /api/master/customers?page=1&limit=50&search=xyz
POST   /api/master/customers
GET    /api/master/customers/:id
PUT    /api/master/customers/:id
DELETE /api/master/customers/:id
```

#### Finished Goods
```http
GET    /api/master/finished-goods?page=1&limit=50&category=tiles
POST   /api/master/finished-goods
GET    /api/master/finished-goods/:id
PUT    /api/master/finished-goods/:id
DELETE /api/master/finished-goods/:id
```

**Create Finished Good:**
```json
{
  "name": { "en": "Ceramic Tile 12x12", "ur": "سرامک ٹائل 12x12" },
  "category": "tiles",
  "unit": "unit_id",
  "specifications": {
    "dimensions": { "length": 12, "width": 12, "unit": "inch" }
  },
  "inventory": {
    "minLevel": 50,
    "reorderLevel": 100
  },
  "pricing": {
    "costPrice": 100,
    "retailPrice": 150
  }
}
```

### Accounting

#### Account Groups
```http
GET    /api/accounting/account-groups?type=asset
POST   /api/accounting/account-groups
PUT    /api/accounting/account-groups/:id
```

**Create Account Group:**
```json
{
  "code": "1100",
  "name": { "en": "Current Assets", "ur": "موجودہ اثاثے" },
  "type": "asset",
  "category": "current_asset",
  "normalBalance": "debit"
}
```

#### Ledger Accounts
```http
GET    /api/accounting/ledger-accounts?page=1&limit=50&type=asset
POST   /api/accounting/ledger-accounts
GET    /api/accounting/ledger-accounts/:id
GET    /api/accounting/ledger-accounts/:id/entries?from=2024-01-01&to=2024-01-31
PUT    /api/accounting/ledger-accounts/:id
DELETE /api/accounting/ledger-accounts/:id
```

**Create Ledger Account:**
```json
{
  "code": "111001",
  "name": { "en": "Cash in Hand", "ur": "نقد در دست" },
  "accountGroup": "account_group_id",
  "type": "asset",
  "isCashAccount": true
}
```

#### Chart of Accounts
```http
GET /api/accounting/chart-of-accounts
```

#### Transactions
```http
GET    /api/accounting/transactions?page=1&limit=50&from=2024-01-01&to=2024-01-31
POST   /api/accounting/transactions
GET    /api/accounting/transactions/:id
POST   /api/accounting/transactions/:id/post
POST   /api/accounting/transactions/:id/reverse
```

**Create Transaction:**
```json
{
  "date": "2024-01-15",
  "type": "journal",
  "description": { "en": "Sample Journal Entry", "ur": "نمونہ اندراج" },
  "entries": [
    {
      "accountId": "account_id_1",
      "entryType": "debit",
      "amount": 1000,
      "description": "Debit entry"
    },
    {
      "accountId": "account_id_2",
      "entryType": "credit",
      "amount": 1000,
      "description": "Credit entry"
    }
  ]
}
```

#### Trial Balance
```http
GET /api/accounting/trial-balance?asOfDate=2024-01-31
```

#### Fiscal Years
```http
GET    /api/accounting/fiscal-years
GET    /api/accounting/fiscal-years/current
POST   /api/accounting/fiscal-years
```

**Create Fiscal Year:**
```json
{
  "name": "FY 2024-2025",
  "startDate": "2024-07-01",
  "endDate": "2025-06-30"
}
```

### Inventory

```http
GET /api/inventory/stock-ledger?itemType=raw_material&itemId=id&from=2024-01-01&to=2024-01-31
GET /api/inventory/stock-balance/:itemType/:itemId
GET /api/inventory/processed-stock
POST /api/inventory/processed-stock
```

### Workers Activity

```http
GET    /api/workers/activities?workerId=id&from=2024-01-01&to=2024-01-31
POST   /api/workers/activities
PUT    /api/workers/activities/:id/approve
GET    /api/workers/payments
POST   /api/workers/payments
PUT    /api/workers/payments/:id/pay
```

**Record Activity:**
```json
{
  "workerId": "worker_id",
  "date": "2024-01-15",
  "activityType": "production",
  "timeTracking": {
    "checkIn": "2024-01-15T08:00:00Z",
    "checkOut": "2024-01-15T17:00:00Z",
    "breakStart": "2024-01-15T13:00:00Z",
    "breakEnd": "2024-01-15T14:00:00Z"
  },
  "production": {
    "batchId": "batch_id",
    "quantityProduced": 100,
    "quantityApproved": 95,
    "quantityRejected": 5
  }
}
```

### Composition & Ball Mill

```http
GET    /api/composition/compositions
POST   /api/composition/compositions
GET    /api/composition/compositions/:id
GET    /api/composition/ball-mills
POST   /api/composition/ball-mills
GET    /api/composition/batches
POST   /api/composition/batches
PUT    /api/composition/batches/:id/complete
```

**Create Composition:**
```json
{
  "name": { "en": "Body Composition A", "ur": "بڈی کمپوزیشن اے" },
  "type": "body",
  "items": [
    {
      "material": "material_id_1",
      "quantity": 50,
      "unit": "unit_id",
      "wastage": 2
    },
    {
      "material": "material_id_2",
      "quantity": 30,
      "unit": "unit_id"
    }
  ],
  "outputUnit": "unit_id"
}
```

### Production

```http
GET    /api/production/batches
POST   /api/production/batches
GET    /api/production/batches/:id
PUT    /api/production/batches/:id/start
PUT    /api/production/batches/:id/stage/:stageNumber
PUT    /api/production/batches/:id/complete
```

**Create Production Batch:**
```json
{
  "finishedGood": "finished_good_id",
  "variant": { "color": "White", "size": "12x12" },
  "targetQuantity": 1000,
  "materialsConsumed": [
    {
      "material": "material_id",
      "quantity": 500,
      "unit": "unit_id"
    }
  ],
  "stages": [
    { "stage": "section_id_1", "name": "Mixing" },
    { "stage": "section_id_2", "name": "Forming" },
    { "stage": "section_id_3", "name": "Drying" },
    { "stage": "section_id_4", "name": "Firing" }
  ],
  "expectedCompletion": "2024-01-20"
}
```

### Cash Register

#### Sales
```http
GET    /api/cash-register/sales?page=1&limit=50&customer=id&from=2024-01-01
POST   /api/cash-register/sales
GET    /api/cash-register/sales/:id
POST   /api/cash-register/sales/:id/payment
```

**Create Sale Invoice:**
```json
{
  "customer": "customer_id",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "items": [
    {
      "finishedGood": "finished_good_id",
      "variant": { "color": "White", "size": "12x12" },
      "quantity": 100,
      "unitPrice": 150,
      "tax": { "rate": 18 }
    }
  ],
  "payment": { "method": "credit" }
}
```

**Record Payment:**
```json
{
  "amount": 5000,
  "method": "cash",
  "reference": "Receipt #123",
  "notes": "Partial payment"
}
```

#### Purchases
```http
GET    /api/cash-register/purchases
POST   /api/cash-register/purchases
GET    /api/cash-register/purchases/:id
```

#### Cash Transactions
```http
GET    /api/cash-register/transactions
POST   /api/cash-register/transactions
```

### Bank

```http
GET    /api/bank/accounts
POST   /api/bank/accounts
GET    /api/bank/accounts/:id
PUT    /api/bank/accounts/:id
GET    /api/bank/transactions
POST   /api/bank/transactions
PUT    /api/bank/transactions/:id/clear
```

**Create Bank Account:**
```json
{
  "bankName": "Habib Bank Limited",
  "branchName": "Main Branch",
  "accountNumber": "1234567890",
  "accountTitle": "My Ceramics Factory",
  "accountType": "current",
  "openingBalance": { "amount": 100000, "date": "2024-01-01" }
}
```

### Reports

```http
# Dashboard
GET /api/reports/dashboard

# Stock Reports
GET /api/reports/stock?itemType=raw_material&category=id
GET /api/reports/stock-movements?itemType=raw_material&itemId=id&from=2024-01-01&to=2024-01-31
GET /api/reports/low-stock

# Accounting Reports
GET /api/reports/ledger?asOfDate=2024-01-31
GET /api/reports/trial-balance?asOfDate=2024-01-31
GET /api/reports/balance-sheet?asOfDate=2024-01-31
GET /api/reports/profit-loss?from=2024-01-01&to=2024-01-31

# Production Reports
GET /api/reports/production?from=2024-01-01&to=2024-01-31
GET /api/reports/wip
GET /api/reports/production-efficiency?from=2024-01-01&to=2024-01-31

# Sales & Purchase Reports
GET /api/reports/sales?from=2024-01-01&to=2024-01-31&groupBy=day
GET /api/reports/purchases?from=2024-01-01&to=2024-01-31

# Customer & Supplier Reports
GET /api/reports/customer-statement?customerId=id&from=2024-01-01&to=2024-01-31
GET /api/reports/supplier-statement?supplierId=id&from=2024-01-01&to=2024-01-31
GET /api/reports/aging?type=receivable

# Worker Reports
GET /api/reports/worker-ledger?workerId=id&from=2024-01-01&to=2024-01-31
GET /api/reports/daily-attendance?date=2024-01-15
GET /api/reports/payroll-summary?startDate=2024-01-01&endDate=2024-01-31
GET /api/reports/worker-productivity?workerId=id&from=2024-01-01&to=2024-01-31
```

### Dictionary

```http
GET  /api/dictionary/translations?language=en
GET  /api/dictionary?context=general&search=save
POST /api/dictionary
PUT  /api/dictionary/:id
```

**Create Dictionary Entry:**
```json
{
  "key": "custom.label",
  "context": "general",
  "defaultTranslations": {
    "en": "Custom Label",
    "ur": "کسٹم لیبل"
  }
}
```

### Audit Logs

```http
GET /api/audit-logs?userId=id&action=CREATE&from=2024-01-01&to=2024-01-31
GET /api/audit-logs/recent?limit=20
GET /api/audit-logs/entity/SaleInvoice/:id
GET /api/audit-logs/user/:userId
```

## Database Models

### Core Models
- `User` - User accounts with roles
- `Company` - Multi-tenant company data
- `Role` - Permission-based roles
- `UserPreferences` - User settings
- `AuditLog` - Activity tracking

### Accounting Models
- `AccountGroup` - Chart of account groups
- `LedgerAccount` - General ledger accounts
- `FiscalYear` - Accounting periods
- `LedgerTransaction` - Double-entry transactions
- `LedgerEntry` - Individual debit/credit entries

### Master Data Models
- `Section` - Production departments
- `Unit` - Measurement units
- `MaterialType` - Raw material categories
- `RawMaterial` - Inventory items
- `Worker` - Employee records
- `Supplier` - Vendor records
- `Customer` - Client records
- `FinishedGood` - Product catalog

### Inventory Models
- `StockLedger` - Stock movements
- `ProcessedStock` - Ball mill output

### Worker Models
- `WorkerActivity` - Daily activity records
- `WorkerPayment` - Wage payments

### Production Models
- `Composition` - Material formulas
- `BallMill` - Ball mill records
- `BallMillBatch` - Slip batches
- `ProductionBatch` - Production orders

### Transaction Models
- `SaleInvoice` - Sales records
- `PurchaseInvoice` - Purchase records
- `CashTransaction` - Cash movements
- `BankAccount` - Bank records
- `BankTransaction` - Bank transactions

### Dictionary Model
- `Dictionary` - Translation entries

## Services

### AccountingService
- `createJournalEntry()` - Create double-entry transactions
- `postTransaction()` - Post to ledger
- `postSaleInvoice()` - Auto-post sales
- `postPurchaseInvoice()` - Auto-post purchases
- `postWorkerPayment()` - Auto-post wages
- `getTrialBalance()` - Generate trial balance
- `getBalanceSheet()` - Generate balance sheet
- `getProfitLoss()` - Generate P&L

### InventoryService
- `recordMovement()` - Record stock movement
- `getStockValuation()` - Get inventory value
- `getLowStockItems()` - Get reorder alerts
- `getStockMovements()` - Get movement history
- `adjustStock()` - Adjust stock levels
- `transferStock()` - Transfer between locations

### ProductionService
- `createBatch()` - Create production batch
- `updateStage()` - Update production stage
- `completeBatch()` - Complete production
- `getProductionReport()` - Production summary
- `getWIPReport()` - Work in progress
- `getEfficiencyReport()` - Efficiency metrics

### WorkerService
- `recordActivity()` - Record daily activity
- `calculateWages()` - Calculate worker wages
- `createPayment()` - Create payment record
- `processPayment()` - Process payment
- `getWorkerLedger()` - Worker statement
- `getPayrollSummary()` - Payroll summary

### ReportService
- `getDashboardSummary()` - Dashboard data
- `getStockReport()` - Stock report
- `getSalesReport()` - Sales analysis
- `getPurchaseReport()` - Purchase analysis
- `getCustomerStatement()` - Customer ledger
- `getSupplierStatement()` - Supplier ledger
- `getAgingReport()` - Receivables/Payables aging

## Authentication

All protected routes require a Bearer token:

```http
Authorization: Bearer <jwt_token>
```

## Company Isolation

All business data is automatically filtered by the user's company. Super Admin users can access all companies by specifying:

```http
X-Company-Id: <company_id>
```

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Constants

All enums and constants are available in `/src/constants/index.js`:

```javascript
const { ROLES, ACCOUNT_TYPES, TRANSACTION_TYPES, PERMISSIONS } = require('./constants');
```

## Helpers

Utility functions in `/src/utils/helpers.js`:

```javascript
const { formatCurrency, formatDate, paginate, groupBy } = require('./utils/helpers');
```

## Scripts

```bash
npm run seed      # Seed database with default data
npm run dev       # Start development server
npm start         # Start production server
npm test          # Run tests
```

## License

MIT
#   S y n e r g y S p a c e - b a c k e n d  
 