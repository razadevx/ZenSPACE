import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, Wallet, Landmark, Package, Boxes, Users,
  AlertTriangle, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore, useUIStore } from '@/stores';
import { cn, formatCurrency } from '@/lib/utils';
import { rawMaterialApi, finishedGoodApi, workerApi, customerApi } from '@/api/services';
import gsap from 'gsap';
import { toast } from 'sonner';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, color }: MetricCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
  }, []);
  
  return (
    <Card ref={cardRef} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && trendValue && (
              <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend === 'up' && 'text-green-600', trend === 'down' && 'text-red-600', trend === 'neutral' && 'text-gray-600')}>
                <TrendingUp className="h-3 w-3" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle, alerts, addAlert } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [metrics, setMetrics] = useState({
    totalSalesToday: 125000,
    cashBalance: 45000,
    bankBalance: 280000,
    processedStock: { clay: 500, glaze: 200, color: 150 },
    finishedGoodsCount: 0,
    workersCount: 0,
    lowStockCount: 0,
    creditLimitWarnings: 0,
  });
  
  const [activities, setActivities] = useState<any[]>([]);
  
  useEffect(() => {
    setPageTitle(t('navigation.dashboard'));
  }, [setPageTitle, t]);
  
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' });
    }
  }, []);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch all data in parallel
        const [materials, products, workers, customers] = await Promise.all([
          rawMaterialApi.getAll(),
          finishedGoodApi.getAll(),
          workerApi.getAll(),
          customerApi.getAll(),
        ]);
        
        // Calculate low stock items
        const lowStockMaterials = materials.filter(m => m.stock <= m.minStock);
        const lowStockProducts = products.filter(p => p.stock <= p.minStock);
        
        // Calculate credit limit warnings
        const creditWarnings = customers.filter(c => c.currentBalance >= c.creditLimit * 0.8);
        
        setMetrics(prev => ({
          ...prev,
          finishedGoodsCount: products.length,
          workersCount: workers.length,
          lowStockCount: lowStockMaterials.length + lowStockProducts.length,
          creditLimitWarnings: creditWarnings.length,
        }));
        
        // Add alerts for low stock
        if (lowStockMaterials.length > 0) {
          addAlert({
            type: 'warning',
            title: 'Low Stock Alert',
            message: `${lowStockMaterials.length} materials are below minimum stock level`,
            isRead: false,
          });
        }
        
        // Add alerts for credit limit
        if (creditWarnings.length > 0) {
          addAlert({
            type: 'warning',
            title: 'Credit Limit Warning',
            message: `${creditWarnings.length} customers are near their credit limit`,
            isRead: false,
          });
        }
        
        // Generate activities
        const recentActivities = [
          { id: '1', action: 'Dashboard loaded', user: user?.name || 'System', time: 'Just now', module: 'System' },
          { id: '2', action: `${materials.length} materials in stock`, user: 'System', time: 'Just now', module: 'Inventory' },
          { id: '3', action: `${products.length} products available`, user: 'System', time: 'Just now', module: 'Products' },
          { id: '4', action: `${workers.length} workers registered`, user: 'System', time: 'Just now', module: 'Workers' },
        ];
        setActivities(recentActivities);
        
      } catch (error: any) {
        toast.error('Failed to load dashboard data: ' + error.message);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };
  
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500 bg-red-50';
      case 'warning': return 'text-yellow-500 bg-yellow-50';
      case 'success': return 'text-green-500 bg-green-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };
  
  return (
    <div ref={containerRef} className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground">Here's what's happening in your factory today</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
          <p className="text-lg font-semibold">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales Today"
          value={formatCurrency(metrics.totalSalesToday)}
          icon={TrendingUp}
          color="bg-blue-500"
          trend="up"
          trendValue="+12% from yesterday"
        />
        <MetricCard
          title="Cash Balance"
          value={formatCurrency(metrics.cashBalance)}
          icon={Wallet}
          color="bg-green-500"
        />
        <MetricCard
          title="Bank Balance"
          value={formatCurrency(metrics.bankBalance)}
          icon={Landmark}
          color="bg-purple-500"
        />
        <MetricCard
          title="Processed Stock"
          value={`${metrics.processedStock.clay} kg`}
          subtitle={`Glaze: ${metrics.processedStock.glaze}L | Color: ${metrics.processedStock.color}L`}
          icon={Package}
          color="bg-orange-500"
        />
        <MetricCard
          title="Finished Goods"
          value={metrics.finishedGoodsCount}
          icon={Boxes}
          color="bg-cyan-500"
        />
        <MetricCard
          title="Total Workers"
          value={metrics.workersCount}
          icon={Users}
          color="bg-pink-500"
        />
        <MetricCard
          title="Low Stock Items"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          color={metrics.lowStockCount > 0 ? 'bg-red-500' : 'bg-green-500'}
        />
        <MetricCard
          title="Credit Warnings"
          value={metrics.creditLimitWarnings}
          icon={AlertCircle}
          color={metrics.creditLimitWarnings > 0 ? 'bg-yellow-500' : 'bg-green-500'}
        />
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Today's Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{activity.module}</Badge>
                        <span className="text-xs text-muted-foreground">by {activity.user}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Warnings & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warnings & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No alerts at the moment</p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const Icon = getAlertIcon(alert.type);
                    return (
                      <div key={alert._id} className={cn('flex items-start gap-3 p-3 rounded-lg', getAlertColor(alert.type))}>
                        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-sm opacity-80">{alert.message}</p>
                        </div>
                        {!alert.isRead && <Badge variant="secondary" className="text-xs">New</Badge>}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'New Sale', icon: TrendingUp, path: '/cash' },
              { label: 'Add Purchase', icon: Package, path: '/cash' },
              { label: 'Record Production', icon: Boxes, path: '/production' },
              { label: 'Worker Activity', icon: Users, path: '/workers' },
            ].map((action) => (
              <a key={action.label} href={action.path} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <action.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
