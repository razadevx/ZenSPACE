import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Factory, Plus, Play, CheckCircle, Clock, Package,
  ArrowRight, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUIStore } from '@/stores';
import { formatNumber, formatDate } from '@/lib/utils';
import { productionApi, type ProductionBatch } from '@/api/services';
import { toast } from 'sonner';
import gsap from 'gsap';

export function ProductionPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('active');
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    setPageTitle(t('navigation.production'));
  }, [setPageTitle, t]);
  
  useEffect(() => {
    gsap.fromTo(
      '.production-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);
  
  useEffect(() => {
    const fetchBatches = async () => {
      setIsLoading(true);
      try {
        const response = await productionApi.getProductionBatches();
        setBatches(response.data);
      } catch (error: any) {
        toast.error('Failed to load production batches: ' + (error.response?.data?.message || error.message));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBatches();
  }, []);
  
  const demoBatches = batches.length > 0 ? batches : [
    {
      _id: '1',
      batchNo: 'PROD-001',
      finishedGood: 'Ceramic Cup 10oz',
      productionDate: new Date().toISOString(),
      quantity: 1000,
      stages: [
        {
          stage: 'Clay Forming',
          stageNumber: 1,
          status: 'completed',
          inputQuantity: 1000,
          outputQuantity: 950,
          rejectedQuantity: 50,
          workers: ['John Doe', 'Jane Smith'],
          startTime: new Date().toISOString()
        }
      ],
      status: 'in_progress',
      totalLoss: 50,
      companyId: '',
      createdBy: '',
      createdAt: new Date().toISOString(),
    },
    {
      _id: '2',
      batchNo: 'PROD-002',
      finishedGood: 'Ceramic Plate 8inch',
      productionDate: new Date().toISOString(),
      quantity: 500,
      stages: [
        {
          stage: 'Clay Forming',
          stageNumber: 1,
          status: 'completed',
          inputQuantity: 500,
          outputQuantity: 490,
          rejectedQuantity: 10,
          workers: ['John Doe'],
          startTime: new Date().toISOString()
        },
        {
          stage: 'Glaze & Color',
          stageNumber: 2,
          status: 'completed',
          inputQuantity: 490,
          outputQuantity: 475,
          rejectedQuantity: 15,
          workers: ['Jane Smith'],
          startTime: new Date().toISOString()
        }
      ],
      status: 'completed',
      totalLoss: 25,
      actualOutput: 475,
      companyId: '',
      createdBy: '',
      createdAt: new Date().toISOString(),
    },
    {
      _id: '3',
      batchNo: 'PROD-003',
      finishedGood: 'Ceramic Bowl 6inch',
      productionDate: new Date().toISOString(),
      quantity: 750,
      stages: [],
      status: 'planned',
      totalLoss: 0,
      companyId: '',
      createdBy: '',
      createdAt: new Date().toISOString(),
    },
  ] as ProductionBatch[];
  
  const productionStages = [
    { id: 'clay', name: 'Clay Forming', icon: Package },
    { id: 'glaze', name: 'Glaze & Color', icon: Factory },
    { id: 'kiln', name: 'Kiln Firing', icon: Factory },
    { id: 'flower', name: 'Flower Application', icon: Package },
    { id: 'sticker', name: 'Sticker Application', icon: Package },
    { id: 'packing', name: 'Packing', icon: Package },
  ];
  
  const activeBatches = demoBatches.filter(b => b.status === 'in_progress');
  const completedBatches = demoBatches.filter(b => b.status === 'completed');
  
  return (
    <div className="production-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.production')}</h1>
          <p className="text-muted-foreground">
            Track production batches and stages
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>
      
      {/* Production Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Production Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {productionStages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex items-center">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg min-w-[100px]">
                    <Icon className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-center font-medium">{stage.name}</span>
                  </div>
                  {index < productionStages.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Batches Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="active">
            Active ({activeBatches.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedBatches.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="m-0 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeBatches.map((batch) => (
              <Card key={batch._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{batch.batchNo}</p>
                        <p className="text-sm text-muted-foreground">{batch.finishedGood}</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500">In Progress</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Stage</span>
                      <span className="font-medium">{batch.stages.length > 0 ? batch.stages[batch.stages.length - 1]?.stage || 'N/A' : 'Not Started'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{batch.stages.length > 0 ? Math.round((batch.stages.reduce((acc, stage) => acc + (stage.outputQuantity || 0), 0) / batch.quantity) * 100) : 0}%</span>
                    </div>
                    <Progress value={batch.stages.length > 0 ? Math.round((batch.stages.reduce((acc, stage) => acc + (stage.outputQuantity || 0), 0) / batch.quantity) * 100) : 0} className="h-2" />
                    
                    <div className="pt-3 border-t flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity: </span>
                        <span className="font-medium">{formatNumber(batch.quantity, 0)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Loss: {batch.totalLoss}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1">
                      <Play className="h-4 w-4 mr-1" />
                      Update
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="completed" className="m-0 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {completedBatches.map((batch) => (
              <Card key={batch._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{batch.batchNo}</p>
                        <p className="text-sm text-muted-foreground">{batch.finishedGood}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">Completed</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Final Output</span>
                      <span className="font-medium">{formatNumber(batch.actualOutput || batch.quantity - batch.totalLoss, 0)} pcs</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Loss</span>
                      <span className="font-medium text-red-500">{batch.totalLoss} pcs</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion Date</span>
                      <span className="font-medium">{formatDate(batch.productionDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
