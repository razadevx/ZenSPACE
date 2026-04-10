import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, TrendingDown, Receipt, RotateCcw, Wallet,
  Plus, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { cashApi, type CashSummary, type CashTransaction } from '@/api/services';
import { toast } from 'sonner';
import gsap from 'gsap';

export function CashRegisterPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('sales');
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [dailySummary, tx] = await Promise.all([
          cashApi.getDailySummary(),
          cashApi.getTransactions(),
        ]);
        setSummary(dailySummary);
        setTransactions(tx);
      } catch (error: any) {
        toast.error('Failed to load cash register data: ' + (error.response?.data?.message || error.message));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);
  
  const tabs = [
    { id: 'sales', label: t('cashRegister.sales'), icon: TrendingUp },
    { id: 'purchases', label: t('cashRegister.purchases'), icon: TrendingDown },
    { id: 'sales-returns', label: t('cashRegister.salesReturn'), icon: RotateCcw },
    { id: 'purchase-returns', label: t('cashRegister.purchaseReturn'), icon: RotateCcw },
    { id: 'expenses', label: t('cashRegister.cashTransactions'), icon: Wallet },
  ];
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'purchase': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'expense': return <Wallet className="h-4 w-4 text-orange-500" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };
  
  const totalSales = summary?.totalSales ?? 0;
  const totalPurchases = summary?.totalPurchases ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netCash = summary?.netCash ?? (totalSales - totalPurchases - totalExpenses);
  
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Transaction
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5">
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
                <Input placeholder="Search..." className="pl-10 w-[250px]" />
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
                    {transactions.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground text-sm">
                          No transactions found for today.
                        </td>
                      </tr>
                    )}
                    {transactions.map((tx) => (
                      <tr key={tx._id ?? tx.documentNo} className="border-b hover:bg-muted/50">
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
                          <Badge
                            className={cn(
                              tx.status === 'completed' && 'bg-green-500',
                              tx.status === 'pending' && 'bg-yellow-500'
                            )}
                          >
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
    </div>
  );
}
