import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

// Income & Expenditure
export interface IncomeExpenditureSummary {
  income: number;
  expenses: number;
  profit: number;
  fromDate?: string;
  toDate?: string;
}

// Stock Reports
export interface StockReportItem {
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

export interface StockReport {
  rawMaterials: {
    count: number;
    totalValue: number;
    items: any[];
  };
  finishedGoods: {
    count: number;
    totalValue: number;
    items: any[];
  };
  processedStocks: {
    count: number;
    totalValue: number;
    items: any[];
  };
}

// Ledger Reports
export interface LedgerAccount {
  account: {
    id: string;
    code: string;
    name: { en: string; ur: string };
    type: string;
  };
  debit: number;
  credit: number;
}

export interface LedgerReport {
  asOfDate: string;
  accounts: LedgerAccount[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

// Worker Ledger
export interface WorkerLedgerEntry {
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface WorkerLedger {
  worker: {
    id: string;
    code: string;
    name: { en: string; ur: string };
  };
  ledger: WorkerLedgerEntry[];
  summary: {
    totalEarnings: number;
    totalPaid: number;
    balance: number;
  };
}

// Production Reports
export interface ProductionBatch {
  batchNumber: string;
  finishedGood: { name: string; code: string };
  targetQuantity: number;
  actualOutput: { approved: number; rejected: number };
  cost: { materialCost: number; labourCost: number; overheadCost: number; totalCost: number; costPerPiece: number };
  loss: { totalLoss: number; lossPercentage: number };
}

export interface ProductionReport {
  summary: {
    totalBatches: number;
    totalTarget: number;
    totalProduced: number;
    totalRejected: number;
    totalCost: number;
    avgMaterialCost: number;
    avgLabourCost: number;
    avgLossPercentage: number;
  };
  byProduct: any[];
  batches: ProductionBatch[];
}

// Cost Sheet
export interface CostSheetItem {
  product: { name: string; code: string };
  batches: number;
  quantity: number;
  cost: number;
}

export interface CostSheet {
  summary: ProductionReport['summary'];
  byProduct: CostSheetItem[];
}

// Date Range Params
interface DateRangeParams {
  from?: string;
  to?: string;
}

export const reportsApi = {
  // Income & Expenditure
  getIncomeExpenditure: async (params?: DateRangeParams): Promise<IncomeExpenditureSummary> => {
    const response = await apiClient.get<ApiResponse<IncomeExpenditureSummary>>('/reports/income-expenditure', { params });
    const payload = (response.data as any).data ?? response.data;
    return {
      income: payload.income ?? 0,
      expenses: payload.expenses ?? 0,
      profit: payload.profit ?? 0,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
    };
  },

  // Stock Reports
  getStockReport: async (params?: { itemType?: string; category?: string }): Promise<StockReport> => {
    const response = await apiClient.get<ApiResponse<StockReport>>('/reports/stock', { params });
    return (response.data as any).data ?? response.data;
  },

  getStockMovements: async (params?: { itemType?: string; itemId?: string } & DateRangeParams): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>('/reports/stock-movements', { params });
    return (response.data as any).data ?? response.data;
  },

  // Ledger Reports (Trial Balance)
  getLedgerReport: async (params?: { asOfDate?: string }): Promise<LedgerReport> => {
    const response = await apiClient.get<ApiResponse<LedgerReport>>('/reports/ledger', { params });
    return (response.data as any).data ?? response.data;
  },

  getTrialBalance: async (params?: { asOfDate?: string }): Promise<LedgerReport> => {
    const response = await apiClient.get<ApiResponse<LedgerReport>>('/reports/trial-balance', { params });
    return (response.data as any).data ?? response.data;
  },

  // Worker Ledger
  getWorkerLedger: async (workerId: string, params?: DateRangeParams): Promise<WorkerLedger> => {
    const response = await apiClient.get<ApiResponse<WorkerLedger>>('/reports/worker-ledger', {
      params: { workerId, ...params }
    });
    return (response.data as any).data ?? response.data;
  },

  // Production Reports
  getProductionReport: async (params?: DateRangeParams): Promise<ProductionReport> => {
    const response = await apiClient.get<ApiResponse<ProductionReport>>('/reports/production', { params });
    return (response.data as any).data ?? response.data;
  },

  // Cost Sheet
  getCostSheet: async (params?: DateRangeParams): Promise<CostSheet> => {
    const response = await apiClient.get<ApiResponse<CostSheet>>('/reports/cost-sheet', { params });
    return (response.data as any).data ?? response.data;
  },
};

