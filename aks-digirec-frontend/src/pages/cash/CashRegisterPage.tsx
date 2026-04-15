import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, TrendingDown, Receipt, RotateCcw, Wallet,
  Plus, Search, RefreshCw, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  cashApi, type UnifiedSummary, type UnifiedTransaction
} from '@/api/services';
import { toast } from 'sonner';
import gsap from 'gsap';
import { ERPTransactionForm } from '@/components/cash/ERPTransactionForm';

type TabType = 'all' | 'sales' | 'purchases' | 'sales-returns' | 'purchase-returns' | 'expenses' | 'income';

// Helper to safely get string value from possibly object name
function getNameString(name: string | { en?: string; ur?: string } | undefined): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.en || name.ur || '';
}

interface TableRow {
  _id: string;
  documentNo: string;
  date: string;
  party: string;
  amount: number;
  paymentMode: string;
  status: string;
  type: UnifiedTransaction['type'];
}

// Tab to transaction type mapping
const TAB_TYPE_MAP: Record<TabType, string | null> = {
  'all': null,
  'sales': 'SALE',
  'purchases': 'PURCHASE',
  'sales-returns': 'SALES_RETURN',
  'purchase-returns': 'PURCHASE_RETURN',
  'expenses': 'EXPENSE',
  'income': 'INCOME'
};

// Simple error boundary component
class CashRegisterErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CashRegisterPage Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-700 mb-4">Something went wrong</h2>
            <pre className="text-sm text-red-600 bg-red-100 p-4 rounded overflow-auto max-h-96">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function CashRegisterPage() {
  return (
    <CashRegisterErrorBoundary>
      <CashRegisterPageContent />
    </CashRegisterErrorBoundary>
  );
}

function CashRegisterPageContent() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [summary, setSummary] = useState<UnifiedSummary | null>(null);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // New Transaction Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle(t('navigation.dailyCashRegister'));
  }, [setPageTitle, t]);

  useEffect(() => {
    gsap.fromTo(
      '.cash-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);

  // Load daily summary using unified API
  const loadSummary = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      console.log('[DEBUG] loadSummary called:', { dateStr });
      const dailySummary = await cashApi.getUnifiedSummary(dateStr);
      console.log('[DEBUG] Summary received:', dailySummary);
      setSummary(dailySummary);
    } catch (error: any) {
      console.error('[DEBUG] Failed to load summary:', error);
    }
  }, [selectedDate]);

  // Load tab-specific data using unified API
  const loadTabData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const typeFilter = TAB_TYPE_MAP[activeTab];

      console.log('[DEBUG] loadTabData called:', { activeTab, typeFilter, dateStr });

      const params: { from: string; to: string; type?: string } = {
        from: dateStr,
        to: dateStr
      };

      // Add type filter if not 'all' tab
      if (typeFilter) {
        params.type = typeFilter;
      }

      console.log('[DEBUG] API params:', params);

      // Use unified API
      const transactions = await cashApi.getUnifiedTransactions(params);

      console.log('[DEBUG] Received transactions:', transactions.length);
      if (transactions.length > 0) {
        const first = transactions[0];
        console.log('[DEBUG] First transaction:', {
          _id: first._id,
          type: first.type,
          amount: first.amount,
          transactionDate: first.transactionDate,
          status: first.status,
          companyId: first.companyId
        });
      }

      // Map unified transactions to TableRow format
      const data: TableRow[] = transactions.map((item: UnifiedTransaction) => ({
        _id: item._id,
        documentNo: item.documentNo,
        date: item.transactionDate,
        party: item.partyName || getNameString(item.partyId?.name) || item.partyId?.businessName || 'Walk-in',
        amount: item.amount || 0,
        paymentMode: item.paymentMode || 'CASH',
        status: item.status,
        type: item.type
      }));

      console.log('[DEBUG] Mapped table data:', data.length);
      setTableData(data);
    } catch (error: any) {
      toast.error('Failed to load data: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedDate]);

  // Load data when tab or date changes
  useEffect(() => {
    loadSummary();
    loadTabData();
  }, [loadSummary, loadTabData]);
  
  const tabs = [
    { id: 'all' as TabType, label: 'All', icon: Receipt },
    { id: 'sales' as TabType, label: t('cashRegister.sales') || 'Sales', icon: TrendingUp },
    { id: 'purchases' as TabType, label: t('cashRegister.purchases') || 'Purchases', icon: TrendingDown },
    { id: 'sales-returns' as TabType, label: t('cashRegister.salesReturn') || 'Sales Return', icon: RotateCcw },
    { id: 'purchase-returns' as TabType, label: t('cashRegister.purchaseReturn') || 'Purchase Return', icon: RotateCcw },
    { id: 'expenses' as TabType, label: t('cashRegister.expenses') || 'Expenses', icon: Wallet },
    { id: 'income' as TabType, label: t('cashRegister.income') || 'Income', icon: TrendingUp },
  ];

  const handleRefresh = () => {
    loadSummary();
    loadTabData();
    toast.success('Data refreshed');
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'PURCHASE': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'EXPENSE': return <Wallet className="h-4 w-4 text-orange-500" />;
      case 'SALES_RETURN': return <RotateCcw className="h-4 w-4 text-yellow-500" />;
      case 'PURCHASE_RETURN': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      case 'INCOME': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'RECEIPT': return <Receipt className="h-4 w-4 text-green-500" />;
      case 'PAYMENT': return <Wallet className="h-4 w-4 text-red-500" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'paid': 'bg-green-500',
      'completed': 'bg-green-500',
      'partial': 'bg-yellow-500',
      'pending': 'bg-yellow-500',
      'unpaid': 'bg-red-500',
      'returned': 'bg-blue-500',
      'cancelled': 'bg-gray-500',
    };
    return variants[status] || 'bg-gray-500';
  };

  // Filter data based on search
  const filteredData = tableData.filter(row =>
    row.documentNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.party?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalSales = summary?.totalSales ?? 0;
  const totalPurchases = summary?.totalPurchases ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const totalIncome = summary?.totalIncome ?? 0;
  const netCash = summary?.netCash ?? (totalSales + totalIncome - totalPurchases - totalExpenses);
  
  return (
    <div className="cash-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.dailyCashRegister')}</h1>
          <p className="text-muted-foreground">
            Manage sales, purchases, and cash transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="pl-10 w-[180px]"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalSales)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalPurchases)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Wallet className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Cash</p>
                <p className={cn(
                  'text-2xl font-bold',
                  netCash >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatCurrency(netCash)}
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                netCash >= 0 ? 'bg-green-100' : 'bg-red-100'
              )}>
                <Receipt className={cn(
                  'h-5 w-5',
                  netCash >= 0 ? 'text-green-600' : 'text-red-600'
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Transactions Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabType)}>
        <TabsList className="grid grid-cols-7">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        <TabsContent value={activeTab} className="m-0 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                {tabs.find(t => t.id === activeTab)?.label}
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <p className="text-sm text-muted-foreground mb-4">Loading transactions...</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Document No</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Party</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Payment Mode</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground text-sm">
                          No transactions found for {formatDate(selectedDate)}.
                        </td>
                      </tr>
                    )}
                    {filteredData.map((tx) => (
                      <tr key={tx._id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(tx.type)}
                            <span className="font-medium">{tx.documentNo}</span>
                          </div>
                        </td>
                        <td className="p-3">{formatDate(new Date(tx.date))}</td>
                        <td className="p-3">{tx.party}</td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{tx.paymentMode}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={getStatusBadge(tx.status)}>
                            {tx.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Transaction Dialog */}
      <ERPTransactionForm
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleRefresh}
        defaultDate={selectedDate.toISOString().split('T')[0]}
      />
    </div>
  );
}
