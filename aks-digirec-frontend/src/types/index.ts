// AKS DigiRec - Core Types

// ==================== AUTH TYPES ====================
export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
  companyId?: string;
  permissions: Permission[];
  preferences: UserPreferences;
  status: 'active' | 'inactive' | 'suspended';
  trialExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  module: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface UserPreferences {
  theme: string;
  language: 'en' | 'ur';
  dateFormat: string;
  currency: string;
}

export interface Company {
  _id: string;
  name: string;
  code: string;
  logo?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  status: 'trial' | 'active' | 'suspended' | 'expired';
  trialStartDate?: Date;
  trialEndDate?: Date;
  settings: CompanySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySettings {
  fiscalYearStart: number;
  defaultCurrency: string;
  autoCodePrefix: Record<string, string>;
}

// ==================== MASTER DATA TYPES ====================
export interface Section {
  _id: string;
  companyId: string;
  sectionGroup: string;
  mainSection: string;
  subSection: string;
  code: string;
  isNonMaterial: boolean;
  description?: string;
  status: 'active' | 'inactive';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RawMaterial {
  _id: string;
  companyId: string;
  materialType: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  amount: number;
  rate: number;
  minStock: number;
  maxStock: number;
  openingBalanceDate?: Date;
  details?: string;
  piecesPerSheet?: number;
  piecesRemaining?: number;
  modelBinding?: string;
  lifeLimit?: number;
  lifeUsed?: number;
  status: 'active' | 'inactive';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  _id: string;
  companyId: string;
  supplierType: string;
  name: string;
  code: string;
  contactPerson?: string;
  cellNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  paymentTerms?: string;
  openingBalance: number;
  currentBalance: number;
  defaultMaterialType?: string;
  defaultMaterial?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Worker {
  _id: string;
  companyId: string;
  name: string;
  code: string;
  advanceFixed: number;
  sectionGroup?: string;
  mainSection?: string;
  subSection?: string;
  workerType: string;
  joinDate?: Date;
  fatherName?: string;
  cnic?: string;
  cellNumber?: string;
  address?: string;
  city?: string;
  emergencyContact?: string;
  referredBy?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  _id: string;
  companyId: string;
  name: string;
  code: string;
  customerType: string;
  contactPerson?: string;
  cellNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  creditLimit: number;
  currentBalance: number;
  paymentTerms?: string;
  openingBalance: number;
  status: 'active' | 'inactive' | 'blacklisted';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinishedGood {
  _id: string;
  companyId: string;
  name: string;
  code: string;
  size?: string;
  unit: string;
  category?: string;
  color?: string;
  grossWeight: number;
  grossGlaze: number;
  grossColor: number;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  status: 'active' | 'inactive';
  colorRequired?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ACCOUNTING TYPES ====================
export interface LedgerAccount {
  _id: string;
  companyId: string;
  code: string;
  name: string;
  nameUrdu?: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  accountGroup: string;
  parentAccountId?: string;
  openingBalance: number;
  currentBalance: number;
  entityType?: 'customer' | 'supplier' | 'worker' | 'bank' | 'cash' | 'expense';
  entityId?: string;
  isSystem: boolean;
  status: 'active' | 'inactive';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerTransaction {
  _id: string;
  companyId: string;
  transactionNo: string;
  date: Date;
  description: string;
  referenceType?: string;
  referenceId?: string;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
  postedBy: string;
  postedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  _id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

// ==================== INVENTORY TYPES ====================
export interface StockLedger {
  _id: string;
  companyId: string;
  itemType: 'raw_material' | 'finished_good' | 'processed';
  itemId: string;
  itemName: string;
  date: Date;
  referenceType: string;
  referenceId: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  rate: number;
  amount: number;
  createdBy: string;
  createdAt: Date;
}

export interface ProcessedStock {
  _id: string;
  companyId: string;
  type: 'clay' | 'glaze' | 'color';
  name: string;
  ballMillId?: string;
  compositionId?: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  batchDate?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== WORKERS ACTIVITY TYPES ====================
export interface WorkerActivity {
  _id: string;
  companyId: string;
  workerId: string;
  workerName: string;
  date: Date;
  sectionGroup: string;
  mainSection: string;
  subSection: string;
  attendance: 'present' | 'absent';
  balanceBF: number;
  workedAmount: number;
  advanceDaily: number;
  amountToPay: number;
  paid: number;
  balanceCF: number;
  workDetails: WorkDetail[];
  isClosed: boolean;
  closedAt?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkDetail {
  modelId: string;
  modelName: string;
  category?: string;
  color?: string;
  qtyWorked: number;
  rate: number;
  amount: number;
  additionalLabor: number;
  netAmount: number;
}

// ==================== COMPOSITION TYPES ====================
export interface BallMill {
  _id: string;
  companyId: string;
  name: string;
  type: 'clay' | 'glaze' | 'color';
  capacity: number;
  unit: string;
  description?: string;
  status: 'active' | 'inactive';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Composition {
  _id: string;
  companyId: string;
  ballMillId: string;
  name: string;
  productName: string;
  components: CompositionComponent[];
  yieldPercent: number;
  expectedLoss: number;
  status: 'active' | 'inactive';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompositionComponent {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface BallMillBatch {
  _id: string;
  companyId: string;
  ballMillId: string;
  ballMillName: string;
  compositionId: string;
  compositionName: string;
  batchSize: number;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed';
  outputQuantity?: number;
  actualLoss?: number;
  costPerUnit?: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== PRODUCTION TYPES ====================
export interface ProductionBatch {
  _id: string;
  companyId: string;
  batchNo: string;
  finishedGood: string;
  productionDate: Date;
  quantity: number;
  stages: ProductionStage[];
  status: 'planned' | 'in_progress' | 'completed';
  totalLoss: number;
  actualOutput?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionStage {
  stageId: string;
  stageName: string;
  sectionGroup: string;
  inputQty: number;
  outputQty: number;
  lossQty: number;
  workerActivities: string[];
  materialConsumed: MaterialConsumed[];
  completedAt?: Date;
}

export interface MaterialConsumed {
  materialType: 'clay' | 'glaze' | 'color' | 'flower' | 'sticker' | 'packing';
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
}

// ==================== CASH REGISTER TYPES ====================
export interface SalesInvoice {
  _id: string;
  companyId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  date: Date;
  documentType: 'sales' | 'sales_return';
  items: InvoiceItem[];
  grossTotal: number;
  discountTotal: number;
  netTotal: number;
  paymentMode: 'cash' | 'bank' | 'online' | 'credit' | 'mixed';
  cashAmount?: number;
  bankAmount?: number;
  bankAccountId?: string;
  balanceToCustomer: number;
  remarks?: string;
  postedToLedger: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  itemType: 'finished_good' | 'raw_material';
  itemId: string;
  itemName: string;
  color?: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  discount: number;
  netAmount: number;
}

export interface PurchaseInvoice {
  _id: string;
  companyId: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: Date;
  documentType: 'purchase' | 'purchase_return';
  items: PurchaseItem[];
  grossTotal: number;
  discountTotal: number;
  netTotal: number;
  paymentMode: 'cash' | 'bank' | 'online' | 'credit';
  cashAmount?: number;
  bankAmount?: number;
  bankAccountId?: string;
  paymentTerms?: string;
  dueDate?: Date;
  remarks?: string;
  postedToLedger: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  materialId: string;
  materialName: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  discount: number;
  netAmount: number;
}

export interface CashTransaction {
  _id: string;
  companyId: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  overheadType?: 'production' | 'admin' | 'selling' | 'finance';
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  postedToLedger: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  _id: string;
  companyId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branch?: string;
  openingBalance: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransaction {
  _id: string;
  companyId: string;
  bankAccountId: string;
  date: Date;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reference?: string;
  description?: string;
  postedToLedger: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== DICTIONARY TYPES ====================
export interface DictionaryEntry {
  _id: string;
  companyId: string;
  key: string;
  defaultEnglish: string;
  defaultUrdu: string;
  customEnglish?: string;
  customUrdu?: string;
  module: string;
  context?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== REPORT TYPES ====================
export interface StockReport {
  itemType: string;
  itemId: string;
  itemName: string;
  openingStock: number;
  stockIn: number;
  stockOut: number;
  closingStock: number;
  rate: number;
  value: number;
}

export interface LedgerReport {
  accountId: string;
  accountName: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactions: LedgerTransaction[];
}

export interface CostSheet {
  modelId: string;
  modelName: string;
  directMaterial: number;
  directLabor: number;
  productionOverhead: number;
  totalCost: number;
  costPerPiece: number;
  sellingPrice: number;
  profit: number;
  profitMargin: number;
}

// ==================== DASHBOARD TYPES ====================
export interface DashboardMetrics {
  totalSalesToday: number;
  cashBalance: number;
  bankBalance: number;
  processedStock: {
    clay: number;
    glaze: number;
    color: number;
  };
  finishedGoodsCount: number;
  workersPendingPayments: number;
  lowStockAlerts: number;
  creditLimitWarnings: number;
}

export interface Alert {
  _id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  module?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: Date;
}

// ==================== API RESPONSE TYPES ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  company?: Company;
}
