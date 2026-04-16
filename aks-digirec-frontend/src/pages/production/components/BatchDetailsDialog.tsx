import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Factory, 
  Flame, 
  Flower2, 
  Sticker, 
  Box, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  User
} from 'lucide-react';
import type { ProductionBatch } from '@/api/services';
import { formatNumber, formatDate, getLocalizedName } from '@/lib/utils';

interface BatchDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  batch: ProductionBatch | null;
}

const STAGE_ICONS: Record<string, React.ElementType> = {
  'Clay Forming': Package,
  'Glaze & Color': Factory,
  'Kiln Firing': Flame,
  'Flower Application': Flower2,
  'Sticker Application': Sticker,
  'Packing': Box,
};

const STAGE_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-100 text-yellow-600',
  completed: 'bg-green-100 text-green-600',
  skipped: 'bg-gray-100 text-gray-400',
};

export function BatchDetailsDialog({ open, onClose, batch }: BatchDetailsDialogProps) {
  if (!batch) return null;

  const finishedGoodName = typeof batch.finishedGood === 'object' 
    ? getLocalizedName(batch.finishedGood.name) || 'Unknown Product'
    : getLocalizedName(batch.finishedGood);

  const progress = batch.stages.length > 0 
    ? Math.round((batch.stages.filter(s => s.status === 'completed').length / batch.stages.length) * 100)
    : 0;

  const getStageIcon = (stageName: string) => {
    const Icon = STAGE_ICONS[stageName] || Package;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{batch.batchNumber}</DialogTitle>
            <Badge 
              className={
                batch.status === 'completed' ? 'bg-green-500' :
                batch.status === 'in_progress' ? 'bg-yellow-500' :
                'bg-gray-500'
              }
            >
              {batch.status.replace('_', ' ')}
            </Badge>
          </div>
          <DialogDescription>
            {finishedGoodName} • Started {batch.startedAt ? formatDate(batch.startedAt) : 'Not started'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Production Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Target Quantity</p>
                    <p className="text-lg font-semibold">{formatNumber(batch.targetQuantity, 0)}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Current Output</p>
                    <p className="text-lg font-semibold">
                      {formatNumber(batch.actualOutput?.approved || 0, 0)}
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Loss</p>
                    <p className="text-lg font-semibold text-red-500">
                      {formatNumber(batch.loss?.totalLoss || 0, 0)}
                      {batch.loss?.lossPercentage > 0 && (
                        <span className="text-sm ml-1">({batch.loss.lossPercentage.toFixed(1)}%)</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Current Stage</p>
                    <p className="text-lg font-semibold">
                      {batch.currentStage} of {batch.stages.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Stages Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Production Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batch.stages.map((stage, index) => {
                  const stageName = typeof stage.stage === 'object' 
                    ? getLocalizedName(stage.stage.name) 
                    : getLocalizedName(stage.name) || `Stage ${stage.stageNumber}`;
                  
                  return (
                    <div key={stage.stageNumber} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          stage.status === 'completed' ? 'bg-green-500 text-white' :
                          stage.status === 'in_progress' ? 'bg-yellow-500 text-white' :
                          'bg-gray-200 text-gray-500'
                        }`}>
                          {stage.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : stage.status === 'in_progress' ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <span className="text-xs">{stage.stageNumber}</span>
                          )}
                        </div>
                        {index < batch.stages.length - 1 && (
                          <div className={`w-0.5 h-full mt-1 ${
                            stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                      
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getStageIcon(stageName)}
                            <span className="font-medium">{stageName}</span>
                          </div>
                          <Badge variant="outline" className={STAGE_COLORS[stage.status]}>
                            {stage.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {stage.status !== 'pending' && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Input: {formatNumber(stage.inputQuantity || 0, 0)}</span>
                              {stage.outputQuantity !== undefined && (
                                <span>Output: {formatNumber(stage.outputQuantity, 0)}</span>
                              )}
                            </div>
                            {(stage.rejectedQuantity || 0) > 0 && (
                              <div className="flex items-center gap-1 text-red-500">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Loss: {formatNumber(stage.rejectedQuantity || 0, 0)}</span>
                              </div>
                            )}
                            {stage.startTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {stage.endTime 
                                    ? `${formatDate(stage.startTime)} - ${formatDate(stage.endTime)}`
                                    : `Started: ${formatDate(stage.startTime)}`
                                  }
                                </span>
                              </div>
                            )}
                            {stage.workers && stage.workers.length > 0 && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>
                                  Workers: {stage.workers.map((w: any) => 
                                    w.firstName ? `${w.firstName} ${w.lastName || ''}` : getLocalizedName(w.name) || w._id || w
                                  ).join(', ')}
                                </span>
                              </div>
                            )}
                            {stage.notes && (
                              <p className="italic">Note: {stage.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Materials Consumed */}
          {batch.materialsConsumed && batch.materialsConsumed.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Materials Consumed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {batch.materialsConsumed.map((material, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">
                          {material.materialName || `Material ${idx + 1}`}
                        </p>
                        {material.cost > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Cost: {formatNumber(material.cost * material.quantity, 2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(material.quantity, 2)}</p>
                        {material.unit && (
                          <p className="text-sm text-muted-foreground">{material.unit}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between font-semibold">
                  <span>Total Material Cost</span>
                  <span>{formatNumber(batch.cost?.materialCost || 0, 2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Cost</span>
                  <span>{formatNumber(batch.cost?.materialCost || 0, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Labour Cost</span>
                  <span>{formatNumber(batch.cost?.labourCost || 0, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overhead Cost</span>
                  <span>{formatNumber(batch.cost?.overheadCost || 0, 2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Cost</span>
                  <span>{formatNumber(batch.cost?.totalCost || 0, 2)}</span>
                </div>
                {batch.cost?.costPerPiece > 0 && (
                  <div className="flex justify-between font-semibold text-primary">
                    <span>Cost Per Piece</span>
                    <span>{formatNumber(batch.cost.costPerPiece, 2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {batch.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{batch.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
