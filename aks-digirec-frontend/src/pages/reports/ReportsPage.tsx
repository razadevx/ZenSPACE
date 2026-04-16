import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Package, Users, TrendingUp, DollarSign,
  Calendar, Download, Printer, Filter, Loader2, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import {
  reportsApi,
  workerApi,
  type IncomeExpenditureSummary,
  type StockReport,
  type LedgerReport,
  type WorkerLedger,
  type ProductionReport,
  type CostSheet
} from '@/api/services';
import type { Worker } from '@/types';
import { toast } from 'sonner';
import gsap from 'gsap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ReportsPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('stock');
  const reportRef = useRef<HTMLDivElement>(null);

  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);

  // Loading states
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  // Report data states
  const [incomeSummary, setIncomeSummary] = useState<IncomeExpenditureSummary | null>(null);
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [ledgerReport, setLedgerReport] = useState<LedgerReport | null>(null);
  const [workerLedger, setWorkerLedger] = useState<WorkerLedger | null>(null);
  const [productionReport, setProductionReport] = useState<ProductionReport | null>(null);
  const [costSheet, setCostSheet] = useState<CostSheet | null>(null);

  // Worker selection for worker ledger
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [showWorkerDialog, setShowWorkerDialog] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');

  useEffect(() => {
    setPageTitle(t('navigation.reports'));
  }, [setPageTitle, t]);

  useEffect(() => {
    gsap.fromTo(
      '.reports-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);

  // Load all reports on mount and when dates change
  useEffect(() => {
    loadAllReports();
  }, [fromDate, toDate]);

  // Load workers list
  useEffect(() => {
    const loadWorkers = async () => {
      try {
        const data = await workerApi.getAll();
        setWorkers(data || []);
      } catch (error: any) {
        console.error('Failed to load workers:', error);
      }
    };
    loadWorkers();
  }, []);

  const setLoading = (key: string, value: boolean) => {
    setIsLoading(prev => ({ ...prev, [key]: value }));
  };

  const handleFilter = () => {
    loadAllReports();
    if (selectedWorkerId) {
      loadWorkerLedger(selectedWorkerId);
    }
  };

  const loadAllReports = async () => {
    // Load Income & Expenditure
    setLoading('income', true);
    try {
      const data = await reportsApi.getIncomeExpenditure({ from: fromDate, to: toDate });
      setIncomeSummary(data);
    } catch (error: any) {
      toast.error('Failed to load income & expenditure: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading('income', false);
    }

    // Load Stock Report
    setLoading('stock', true);
    try {
      const data = await reportsApi.getStockReport();
      setStockReport(data);
    } catch (error: any) {
      toast.error('Failed to load stock report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading('stock', false);
    }

    // Load Ledger Report
    setLoading('ledger', true);
    try {
      const data = await reportsApi.getLedgerReport();
      setLedgerReport(data);
    } catch (error: any) {
      toast.error('Failed to load ledger report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading('ledger', false);
    }

    // Load Production Report
    setLoading('production', true);
    try {
      const data = await reportsApi.getProductionReport({ from: fromDate, to: toDate });
      setProductionReport(data);
    } catch (error: any) {
      toast.error('Failed to load production report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading('production', false);
    }

    // Load Cost Sheet
    setLoading('cost', true);
    try {
      const data = await reportsApi.getCostSheet({ from: fromDate, to: toDate });
      setCostSheet(data);
    } catch (error: any) {
      toast.error('Failed to load cost sheet: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading('cost', false);
    }
  };

  const loadWorkerLedger = async (workerId: string) => {
    if (!workerId) return;
    setLoading('workerLedger', true);
    try {
      const data = await reportsApi.getWorkerLedger(workerId, { from: fromDate, to: toDate });
      setWorkerLedger(data);
    } catch (error: any) {
      toast.error('Failed to load worker ledger: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading('workerLedger', false);
    }
  };


  const handlePrint = () => {
    if (reportRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Report - ${activeTab}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .header { margin-bottom: 20px; }
                .date-range { color: #666; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report</h1>
                <div class="date-range">Period: ${fromDate} to ${toDate}</div>
              </div>
              ${reportRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExport = () => {
    let csvContent = '';
    let filename = `${activeTab}_report_${fromDate}_${toDate}.csv`;

    switch (activeTab) {
      case 'stock':
        csvContent = 'Material,Opening,Received,Consumed,Closing,Rate,Value\n';
        if (stockReport) {
          [...stockReport.rawMaterials.items, ...stockReport.finishedGoods.items].forEach((item: any) => {
            csvContent += `${item.name?.en || item.name},${item.currentStock?.quantity || 0},0,0,${item.currentStock?.quantity || 0},${item.costing?.averageCost || 0},${item.currentStock?.value || 0}\n`;
          });
        }
        break;
      case 'ledger':
        csvContent = 'Account Code,Account Name,Type,Debit,Credit\n';
        ledgerReport?.accounts.forEach(acc => {
          csvContent += `${acc.account.code},"${acc.account.name.en}",${acc.account.type},${acc.debit},${acc.credit}\n`;
        });
        break;
      case 'worker':
        csvContent = 'Date,Type,Description,Debit,Credit,Balance\n';
        workerLedger?.ledger.forEach(entry => {
          csvContent += `${entry.date},${entry.type},"${entry.description}",${entry.debit},${entry.credit},${entry.balance}\n`;
        });
        break;
      case 'production':
        csvContent = 'Batch No,Product,Target,Produced,Rejected,Material Cost,Labor Cost,Total Cost\n';
        productionReport?.batches.forEach(batch => {
          csvContent += `${batch.batchNumber},"${batch.finishedGood?.name || ''}",${batch.targetQuantity},${batch.actualOutput?.approved || 0},${batch.actualOutput?.rejected || 0},${batch.cost?.materialCost || 0},${batch.cost?.labourCost || 0},${batch.cost?.totalCost || 0}\n`;
        });
        break;
      case 'cost':
        csvContent = 'Product,Batches,Quantity,Material Cost,Labor Cost,Overhead Cost,Total Cost,Cost Per Piece\n';
        costSheet?.byProduct.forEach(item => {
          const batch = productionReport?.batches.find(b => b.finishedGood?.name === item.product.name);
          csvContent += `"${item.product.name}",${item.batches},${item.quantity},${batch?.cost?.materialCost || 0},${batch?.cost?.labourCost || 0},${batch?.cost?.overheadCost || 0},${item.cost},${batch?.cost?.costPerPiece || 0}\n`;
        });
        break;
      case 'income':
        csvContent = 'Metric,Value\n';
        csvContent += `Total Income,${incomeSummary?.income || 0}\n`;
        csvContent += `Total Expenses,${incomeSummary?.expenses || 0}\n`;
        csvContent += `Net Profit,${incomeSummary?.profit || 0}\n`;
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('Report exported successfully');
  };

  const handleWorkerSelect = (workerId: string) => {
    setSelectedWorkerId(workerId);
    loadWorkerLedger(workerId);
    setShowWorkerDialog(false);
  };

  const filteredWorkers = workers.filter(w =>
    w.name?.toLowerCase().includes(workerSearch.toLowerCase()) ||
    w.code?.toLowerCase().includes(workerSearch.toLowerCase())
  );

  const reportTypes = [
    { id: 'stock', label: t('reports.stockReports'), icon: Package },
    { id: 'ledger', label: t('reports.ledgerReports'), icon: FileText },
    { id: 'worker', label: t('reports.workerLedger'), icon: Users },
    { id: 'production', label: t('reports.productionReports'), icon: TrendingUp },
    { id: 'cost', label: t('reports.costSheet'), icon: DollarSign },
    { id: 'income', label: t('reports.incomeExpenditure'), icon: TrendingUp },
  ];

  // Transform stock data for display
  const transformStockData = () => {
    if (!stockReport) return [];
    const data: any[] = [];

    stockReport.rawMaterials?.items?.forEach((item: any) => {
      data.push({
        name: item.name?.en || item.name,
        opening: item.currentStock?.quantity || 0,
        received: 0,
        consumed: 0,
        closing: item.currentStock?.quantity || 0,
        rate: item.costing?.averageCost || 0,
        value: item.currentStock?.value || 0,
        type: 'Raw Material'
      });
    });

    stockReport.finishedGoods?.items?.forEach((item: any) => {
      data.push({
        name: item.name?.en || item.name,
        opening: item.totalStock?.quantity || 0,
        received: 0,
        consumed: 0,
        closing: item.totalStock?.quantity || 0,
        rate: item.costing?.totalCost || 0,
        value: item.totalStock?.value || 0,
        type: 'Finished Good'
      });
    });

    return data;
  };

  return (
    <div className="reports-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.reports')}</h1>
          <p className="text-muted-foreground">
            View and export business reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Period:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleFilter}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{type.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div ref={reportRef}>
          {/* Stock Reports */}
          <TabsContent value="stock" className="m-0 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.stockReports')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading.stock ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Raw Materials</p>
                        <p className="text-xl font-bold">{stockReport?.rawMaterials?.count || 0}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(stockReport?.rawMaterials?.totalValue || 0)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Finished Goods</p>
                        <p className="text-xl font-bold">{stockReport?.finishedGoods?.count || 0}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(stockReport?.finishedGoods?.totalValue || 0)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Stock Value</p>
                        <p className="text-xl font-bold">
                          {formatCurrency((stockReport?.rawMaterials?.totalValue || 0) + (stockReport?.finishedGoods?.totalValue || 0))}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Item</th>
                            <th className="text-left p-3 font-medium">Type</th>
                            <th className="text-right p-3 font-medium">Quantity</th>
                            <th className="text-right p-3 font-medium">Rate</th>
                            <th className="text-right p-3 font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transformStockData().map((item, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{item.name}</td>
                              <td className="p-3 text-sm">{item.type}</td>
                              <td className="p-3 text-right">{formatNumber(item.closing, 0)}</td>
                              <td className="p-3 text-right">{formatCurrency(item.rate)}</td>
                              <td className="p-3 text-right font-semibold">{formatCurrency(item.value)}</td>
                            </tr>
                          ))}
                          {transformStockData().length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                No stock data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ledger Reports */}
          <TabsContent value="ledger" className="m-0 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.ledgerReports')} - Trial Balance</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading.ledger ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Debit</p>
                        <p className="text-xl font-bold">{formatCurrency(ledgerReport?.totalDebit || 0)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Credit</p>
                        <p className="text-xl font-bold">{formatCurrency(ledgerReport?.totalCredit || 0)}</p>
                      </div>
                      <div className={`p-4 rounded-lg ${ledgerReport?.isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className={`text-xl font-bold ${ledgerReport?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                          {ledgerReport?.isBalanced ? 'Balanced' : 'Unbalanced'}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Account Code</th>
                            <th className="text-left p-3 font-medium">Account Name</th>
                            <th className="text-left p-3 font-medium">Type</th>
                            <th className="text-right p-3 font-medium">Debit</th>
                            <th className="text-right p-3 font-medium">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerReport?.accounts?.map((account, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{account.account.code}</td>
                              <td className="p-3">{account.account.name.en}</td>
                              <td className="p-3 capitalize">{account.account.type}</td>
                              <td className="p-3 text-right">{account.debit > 0 ? formatCurrency(account.debit) : '-'}</td>
                              <td className="p-3 text-right">{account.credit > 0 ? formatCurrency(account.credit) : '-'}</td>
                            </tr>
                          ))}
                          {(!ledgerReport?.accounts || ledgerReport.accounts.length === 0) && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                No ledger data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Worker Ledger */}
          <TabsContent value="worker" className="m-0 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t('reports.workerLedger')}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowWorkerDialog(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  {selectedWorkerId ? 'Change Worker' : 'Select Worker'}
                </Button>
              </CardHeader>
              <CardContent>
                {selectedWorkerId && workerLedger ? (
                  <>
                    <div className="mb-4 p-4 bg-muted rounded-lg">
                      <p className="font-medium">{workerLedger.worker.name.en}</p>
                      <p className="text-sm text-muted-foreground">Code: {workerLedger.worker.code}</p>
                      <div className="flex gap-4 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Earnings</p>
                          <p className="font-semibold text-green-600">{formatCurrency(workerLedger.summary.totalEarnings)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Paid</p>
                          <p className="font-semibold text-blue-600">{formatCurrency(workerLedger.summary.totalPaid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="font-semibold">{formatCurrency(workerLedger.summary.balance)}</p>
                        </div>
                      </div>
                    </div>
                    {isLoading.workerLedger ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Date</th>
                              <th className="text-left p-3 font-medium">Type</th>
                              <th className="text-left p-3 font-medium">Description</th>
                              <th className="text-right p-3 font-medium">Debit</th>
                              <th className="text-right p-3 font-medium">Credit</th>
                              <th className="text-right p-3 font-medium">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workerLedger.ledger?.map((entry, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-3">{formatDate(entry.date)}</td>
                                <td className="p-3 capitalize">{entry.type}</td>
                                <td className="p-3">{entry.description}</td>
                                <td className="p-3 text-right">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                                <td className="p-3 text-right">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                                <td className="p-3 text-right font-semibold">{formatCurrency(entry.balance)}</td>
                              </tr>
                            ))}
                            {(!workerLedger.ledger || workerLedger.ledger.length === 0) && (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                  No transactions found for this period
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a worker to view ledger</p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowWorkerDialog(true)}>
                      Select Worker
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Reports */}
          <TabsContent value="production" className="m-0 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.productionReports')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading.production ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Batches</p>
                        <p className="text-xl font-bold">{productionReport?.summary?.totalBatches || 0}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Produced</p>
                        <p className="text-xl font-bold">{formatNumber(productionReport?.summary?.totalProduced || 0, 0)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Loss %</p>
                        <p className="text-xl font-bold">{(productionReport?.summary?.avgLossPercentage || 0).toFixed(1)}%</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-xl font-bold">{formatCurrency(productionReport?.summary?.totalCost || 0)}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Batch No</th>
                            <th className="text-left p-3 font-medium">Product</th>
                            <th className="text-right p-3 font-medium">Target</th>
                            <th className="text-right p-3 font-medium">Produced</th>
                            <th className="text-right p-3 font-medium">Rejected</th>
                            <th className="text-right p-3 font-medium">Loss %</th>
                            <th className="text-right p-3 font-medium">Cost/Piece</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReport?.batches?.map((batch, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{batch.batchNumber}</td>
                              <td className="p-3">{batch.finishedGood?.name || '-'}</td>
                              <td className="p-3 text-right">{formatNumber(batch.targetQuantity, 0)}</td>
                              <td className="p-3 text-right">{formatNumber(batch.actualOutput?.approved || 0, 0)}</td>
                              <td className="p-3 text-right text-red-600">{formatNumber(batch.actualOutput?.rejected || 0, 0)}</td>
                              <td className="p-3 text-right">{(batch.loss?.lossPercentage || 0).toFixed(1)}%</td>
                              <td className="p-3 text-right">{formatCurrency(batch.cost?.costPerPiece || 0)}</td>
                            </tr>
                          ))}
                          {(!productionReport?.batches || productionReport.batches.length === 0) && (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                No production batches found for this period
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost Sheet */}
          <TabsContent value="cost" className="m-0 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.costSheet')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading.cost ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Material Cost</p>
                        <p className="text-xl font-bold">{formatCurrency(costSheet?.summary?.avgMaterialCost || 0)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Labor Cost</p>
                        <p className="text-xl font-bold">{formatCurrency(costSheet?.summary?.avgLabourCost || 0)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Overhead</p>
                        <p className="text-xl font-bold">{formatCurrency(
                          ((costSheet?.summary?.totalCost || 0) - (costSheet?.summary?.avgMaterialCost || 0) - (costSheet?.summary?.avgLabourCost || 0)) /
                          (costSheet?.summary?.totalBatches || 1)
                        )}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-xl font-bold">{formatCurrency(costSheet?.summary?.totalCost || 0)}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Product</th>
                            <th className="text-right p-3 font-medium">Batches</th>
                            <th className="text-right p-3 font-medium">Quantity</th>
                            <th className="text-right p-3 font-medium">Material Cost</th>
                            <th className="text-right p-3 font-medium">Labor Cost</th>
                            <th className="text-right p-3 font-medium">Overhead</th>
                            <th className="text-right p-3 font-medium">Total Cost</th>
                            <th className="text-right p-3 font-medium">Cost/Piece</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costSheet?.byProduct?.map((item, index) => {
                            const batch = productionReport?.batches.find(b => b.finishedGood?.name === item.product.name);
                            const overhead = (item.cost || 0) - (batch?.cost?.materialCost || 0) - (batch?.cost?.labourCost || 0);
                            return (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-3 font-medium">{item.product.name}</td>
                                <td className="p-3 text-right">{item.batches}</td>
                                <td className="p-3 text-right">{formatNumber(item.quantity, 0)}</td>
                                <td className="p-3 text-right">{formatCurrency(batch?.cost?.materialCost || 0)}</td>
                                <td className="p-3 text-right">{formatCurrency(batch?.cost?.labourCost || 0)}</td>
                                <td className="p-3 text-right">{formatCurrency(overhead > 0 ? overhead : 0)}</td>
                                <td className="p-3 text-right font-semibold">{formatCurrency(item.cost)}</td>
                                <td className="p-3 text-right">{formatCurrency(batch?.cost?.costPerPiece || 0)}</td>
                              </tr>
                            );
                          })}
                          {(!costSheet?.byProduct || costSheet.byProduct.length === 0) && (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                No cost data available for this period
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income & Expenditure */}
          <TabsContent value="income" className="m-0 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.incomeExpenditure')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading.income ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Total Income</p>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(incomeSummary?.income ?? 0)}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-700">
                          {formatCurrency(incomeSummary?.expenses ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Net Profit</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(incomeSummary?.profit ?? 0)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Profit Margin: {incomeSummary && incomeSummary.income > 0
                          ? `${Math.round((incomeSummary.profit / incomeSummary.income) * 100)}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Worker Selection Dialog */}
      <Dialog open={showWorkerDialog} onOpenChange={setShowWorkerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers..."
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredWorkers.map((worker) => (
                <button
                  key={worker._id}
                  onClick={() => handleWorkerSelect(worker._id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border"
                >
                  <p className="font-medium">{worker.name}</p>
                  <p className="text-sm text-muted-foreground">Code: {worker.code} | {worker.workerType}</p>
                </button>
              ))}
              {filteredWorkers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No workers found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
