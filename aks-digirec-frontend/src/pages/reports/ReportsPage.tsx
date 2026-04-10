import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Package, Users, TrendingUp, DollarSign,
  Calendar, Download, Printer, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { reportsApi, type IncomeExpenditureSummary } from '@/api/services';
import { toast } from 'sonner';
import gsap from 'gsap';

export function ReportsPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('stock');
  const [incomeSummary, setIncomeSummary] = useState<IncomeExpenditureSummary | null>(null);
  
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

  useEffect(() => {
    const loadIncome = async () => {
      try {
        const data = await reportsApi.getIncomeExpenditure();
        setIncomeSummary(data);
      } catch (error: any) {
        toast.error('Failed to load income & expenditure summary: ' + (error.response?.data?.message || error.message));
      }
    };

    loadIncome();
  }, []);
  
  const reportTypes = [
    { id: 'stock', label: t('reports.stockReports'), icon: Package },
    { id: 'ledger', label: t('reports.ledgerReports'), icon: FileText },
    { id: 'worker', label: t('reports.workerLedger'), icon: Users },
    { id: 'production', label: t('reports.productionReports'), icon: TrendingUp },
    { id: 'cost', label: t('reports.costSheet'), icon: DollarSign },
    { id: 'income', label: t('reports.incomeExpenditure'), icon: TrendingUp },
  ];
  
  const demoStockReport = [
    { item: 'White Clay', opening: 400, received: 200, consumed: 100, closing: 500, rate: 50, value: 25000 },
    { item: 'Clear Glaze', opening: 100, received: 50, consumed: 70, closing: 80, rate: 200, value: 16000 },
    { item: 'Blue Color', opening: 30, received: 20, consumed: 25, closing: 25, rate: 500, value: 12500 },
  ];
  
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
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button>
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
                placeholder="From"
                className="w-[150px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="To"
                className="w-[150px]"
              />
            </div>
            <Button variant="outline" size="sm">
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
        
        <TabsContent value="stock" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('reports.stockReports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Material</th>
                      <th className="text-right p-3 font-medium">Opening</th>
                      <th className="text-right p-3 font-medium">Received</th>
                      <th className="text-right p-3 font-medium">Consumed</th>
                      <th className="text-right p-3 font-medium">Closing</th>
                      <th className="text-right p-3 font-medium">Rate</th>
                      <th className="text-right p-3 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoStockReport.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{item.item}</td>
                        <td className="p-3 text-right">{formatNumber(item.opening, 0)}</td>
                        <td className="p-3 text-right text-green-600">+{formatNumber(item.received, 0)}</td>
                        <td className="p-3 text-right text-red-600">-{formatNumber(item.consumed, 0)}</td>
                        <td className="p-3 text-right font-semibold">{formatNumber(item.closing, 0)}</td>
                        <td className="p-3 text-right">{formatCurrency(item.rate)}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(item.value)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">{formatCurrency(53500)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ledger" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('reports.ledgerReports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an account to view ledger</p>
                <Button variant="outline" className="mt-4">
                  Select Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="worker" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('reports.workerLedger')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a worker to view ledger</p>
                <Button variant="outline" className="mt-4">
                  Select Worker
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="production" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('reports.productionReports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Batch No</th>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 font-medium">Input</th>
                      <th className="text-right p-3 font-medium">Output</th>
                      <th className="text-right p-3 font-medium">Loss</th>
                      <th className="text-right p-3 font-medium">Loss %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">PROD-001</td>
                      <td className="p-3">Ceramic Cup 10oz</td>
                      <td className="p-3 text-right">1000</td>
                      <td className="p-3 text-right">975</td>
                      <td className="p-3 text-right text-red-600">25</td>
                      <td className="p-3 text-right">2.5%</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">PROD-002</td>
                      <td className="p-3">Dinner Plate 12&quot;</td>
                      <td className="p-3 text-right">500</td>
                      <td className="p-3 text-right">490</td>
                      <td className="p-3 text-right text-red-600">10</td>
                      <td className="p-3 text-right">2.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cost" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('reports.costSheet')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 font-medium">Material</th>
                      <th className="text-right p-3 font-medium">Labor</th>
                      <th className="text-right p-3 font-medium">Overhead</th>
                      <th className="text-right p-3 font-medium">Total Cost</th>
                      <th className="text-right p-3 font-medium">Selling Price</th>
                      <th className="text-right p-3 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">Ceramic Cup 10oz</td>
                      <td className="p-3 text-right">{formatCurrency(25)}</td>
                      <td className="p-3 text-right">{formatCurrency(12)}</td>
                      <td className="p-3 text-right">{formatCurrency(8)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(45)}</td>
                      <td className="p-3 text-right">{formatCurrency(75)}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(30)}</td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">Dinner Plate 12&quot;</td>
                      <td className="p-3 text-right">{formatCurrency(70)}</td>
                      <td className="p-3 text-right">{formatCurrency(30)}</td>
                      <td className="p-3 text-right">{formatCurrency(20)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(120)}</td>
                      <td className="p-3 text-right">{formatCurrency(200)}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(80)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="income" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('reports.incomeExpenditure')}</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
