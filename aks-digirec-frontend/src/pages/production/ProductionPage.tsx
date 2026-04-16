import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Factory, Plus, Play, CheckCircle, Clock, Package,
  ArrowRight, AlertTriangle, Eye, CheckCircle2, Flame, Flower2, Sticker, Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUIStore } from '@/stores';
import { formatNumber, formatDate, getLocalizedName } from '@/lib/utils';
import { productionApi, type ProductionBatch } from '@/api/services';
import { toast } from 'sonner';
import gsap from 'gsap';
import {
  NewBatchDialog,
  StageUpdateDialog,
  BatchDetailsDialog,
  CompleteBatchDialog
} from './components';

const PRODUCTION_STAGES = [
  { id: 'clay', name: 'Clay Forming', icon: Package },
  { id: 'glaze', name: 'Glaze & Color', icon: Factory },
  { id: 'kiln', name: 'Kiln Firing', icon: Flame },
  { id: 'flower', name: 'Flower Application', icon: Flower2 },
  { id: 'sticker', name: 'Sticker Application', icon: Sticker },
  { id: 'packing', name: 'Packing', icon: Box },
];

class ProductionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Production Page Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong in Production Page</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm mb-4">
            {this.state.error?.message}
          </pre>
          {this.state.errorInfo?.componentStack && (
            <div className="mb-4">
              <h3 className="font-bold mb-2">Component Stack:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ProductionPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('active');
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ planned: 0, in_progress: 0, completed: 0, totalBatches: 0, totalProduced: 0 });

  // Dialog states
  const [newBatchOpen, setNewBatchOpen] = useState(false);
  const [stageUpdateOpen, setStageUpdateOpen] = useState(false);
  const [batchDetailsOpen, setBatchDetailsOpen] = useState(false);
  const [completeBatchOpen, setCompleteBatchOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  
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
  
  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const [batchesResponse, statsResponse] = await Promise.all([
        productionApi.getProductionBatches(),
        productionApi.getProductionStats(),
      ]);
      setBatches(batchesResponse.data);
      setStats(statsResponse);
    } catch (error: any) {
      toast.error('Failed to load production batches: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleRefresh = () => {
    fetchBatches();
  };

  const handleUpdateStage = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setStageUpdateOpen(true);
  };

  const handleViewDetails = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setBatchDetailsOpen(true);
  };

  const handleCompleteBatch = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setCompleteBatchOpen(true);
  };

  const getCurrentStageName = (batch: ProductionBatch): string => {
    const currentStage = batch.stages?.find(s => s.status === 'in_progress');
    if (!currentStage) return 'Not Started';
    if (typeof currentStage.stage === 'object' && currentStage.stage?.name) {
      return getLocalizedName(currentStage.stage.name);
    }
    return getLocalizedName(currentStage.name) || `Stage ${currentStage.stageNumber}`;
  };

  const getProgressPercentage = (batch: ProductionBatch): number => {
    if (!batch.stages?.length) return 0;
    const completedStages = batch.stages.filter(s => s.status === 'completed').length;
    return Math.round((completedStages / batch.stages.length) * 100);
  };

  const getFinishedGoodName = (batch: ProductionBatch): string => {
    if (typeof batch.finishedGood === 'object' && batch.finishedGood !== null) {
      const fg = batch.finishedGood as { name?: string | { en?: string; ur?: string } };
      return getLocalizedName(fg.name);
    }
    return String(batch.finishedGood || '');
  };
  
  const activeBatches = batches.filter(b => b.status === 'in_progress' || b.status === 'planned');
  const completedBatches = batches.filter(b => b.status === 'completed');
  
  return (
    <ProductionErrorBoundary>
    <div className="production-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.production')}</h1>
          <p className="text-muted-foreground">
            Track production batches and stages
          </p>
        </div>
        <Button onClick={() => setNewBatchOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Batches</p>
            <p className="text-2xl font-bold">{stats.in_progress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Planned</p>
            <p className="text-2xl font-bold">{stats.planned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Produced</p>
            <p className="text-2xl font-bold">{formatNumber(stats.totalProduced, 0)}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Production Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Production Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {PRODUCTION_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex items-center">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg min-w-[100px]">
                    <Icon className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-center font-medium">{stage.name}</span>
                  </div>
                  {index < PRODUCTION_STAGES.length - 1 && (
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

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        <TabsContent value="active" className="m-0 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeBatches.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No active production batches. Create a new batch to get started.
              </div>
            )}
            {activeBatches.map((batch) => (
              <Card key={batch._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        batch.status === 'in_progress' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        {batch.status === 'in_progress' ? (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <Package className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{batch.batchNumber}</p>
                        <p className="text-sm text-muted-foreground">{getFinishedGoodName(batch)}</p>
                      </div>
                    </div>
                    <Badge className={
                      batch.status === 'in_progress' ? 'bg-yellow-500' :
                      batch.status === 'planned' ? 'bg-gray-500' :
                      'bg-blue-500'
                    }>
                      {batch.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Stage</span>
                      <span className="font-medium">{getCurrentStageName(batch)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{getProgressPercentage(batch)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(batch)} className="h-2" />
                    
                    <div className="pt-3 border-t flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-medium">{formatNumber(batch.targetQuantity, 0)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Loss: {batch.loss?.totalLoss || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    {batch.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleUpdateStage(batch)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Update Stage
                      </Button>
                    )}
                    {batch.status === 'planned' && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleUpdateStage(batch)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleViewDetails(batch)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    {batch.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleCompleteBatch(batch)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="completed" className="m-0 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {completedBatches.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No completed production batches yet.
              </div>
            )}
            {completedBatches.map((batch) => (
              <Card key={batch._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{batch.batchNumber}</p>
                        <p className="text-sm text-muted-foreground">{getFinishedGoodName(batch)}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500">Completed</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Final Output</span>
                      <span className="font-medium">
                        {formatNumber(batch.actualOutput?.approved || 0, 0)} pcs
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Loss</span>
                      <span className="font-medium text-red-500">
                        {batch.loss?.totalLoss || 0} pcs
                        {batch.loss?.lossPercentage > 0 && (
                          <span className="ml-1">({batch.loss.lossPercentage.toFixed(1)}%)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion Date</span>
                      <span className="font-medium">
                        {batch.completedAt ? formatDate(batch.completedAt) : 'N/A'}
                      </span>
                    </div>
                    {batch.cost?.costPerPiece > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cost Per Piece</span>
                        <span className="font-medium">{formatNumber(batch.cost.costPerPiece, 2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleViewDetails(batch)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewBatchDialog
        open={newBatchOpen}
        onClose={() => setNewBatchOpen(false)}
        onSuccess={handleRefresh}
      />

      <StageUpdateDialog
        open={stageUpdateOpen}
        onClose={() => setStageUpdateOpen(false)}
        onSuccess={handleRefresh}
        batch={selectedBatch}
      />

      <BatchDetailsDialog
        open={batchDetailsOpen}
        onClose={() => setBatchDetailsOpen(false)}
        batch={selectedBatch}
      />

      <CompleteBatchDialog
        open={completeBatchOpen}
        onClose={() => setCompleteBatchOpen(false)}
        onSuccess={handleRefresh}
        batch={selectedBatch}
      />
    </div>
    </ProductionErrorBoundary>
  );
}
