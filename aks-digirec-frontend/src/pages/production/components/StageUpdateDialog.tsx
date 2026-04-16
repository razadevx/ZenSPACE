import { useState, useEffect } from 'react';
import { Loader2, Play, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { productionApi, type ProductionBatch } from '@/api/services';
import { workerApi } from '@/api/services';
import type { Worker } from '@/types';
import { getLocalizedName } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StageUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batch: ProductionBatch | null;
}

export function StageUpdateDialog({ open, onClose, onSuccess, batch }: StageUpdateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [formData, setFormData] = useState({
    outputQuantity: '',
    rejectedQuantity: '',
    selectedWorkers: [] as string[],
    notes: '',
  });

  // Get current active stage
  const currentStage = batch?.stages?.find(s => s.status === 'in_progress');
  const currentStageNumber = currentStage?.stageNumber || 1;
  const currentStageName = typeof currentStage?.stage === 'object' 
    ? getLocalizedName(currentStage.stage.name) 
    : getLocalizedName(currentStage?.name) || `Stage ${currentStageNumber}`;

  useEffect(() => {
    if (open && batch) {
      loadWorkers();
      // Pre-fill with input quantity if available
      const inputQty = currentStage?.inputQuantity || batch.targetQuantity;
      setFormData({
        outputQuantity: inputQty?.toString() || '',
        rejectedQuantity: '0',
        selectedWorkers: [],
        notes: '',
      });
    }
  }, [open, batch]);

  const loadWorkers = async () => {
    try {
      const data = await workerApi.getAll();
      setWorkers(data || []);
    } catch (error) {
      toast.error('Failed to load workers');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batch || !currentStage) {
      toast.error('No active batch or stage');
      return;
    }

    if (!formData.outputQuantity) {
      toast.error('Please enter output quantity');
      return;
    }

    setIsLoading(true);
    try {
      await productionApi.updateProductionStage(
        batch._id,
        currentStageNumber,
        {
          outputQuantity: parseInt(formData.outputQuantity),
          rejectedQuantity: parseInt(formData.rejectedQuantity) || 0,
          workers: formData.selectedWorkers,
          notes: formData.notes,
        }
      );

      toast.success(`Stage ${currentStageNumber} completed successfully`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWorker = (workerId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedWorkers: prev.selectedWorkers.includes(workerId)
        ? prev.selectedWorkers.filter(id => id !== workerId)
        : [...prev.selectedWorkers, workerId],
    }));
  };

  const inputQuantity = currentStage?.inputQuantity || batch?.targetQuantity || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Update Production Stage
          </DialogTitle>
          <DialogDescription>
            Record output and workers for the current production stage
          </DialogDescription>
        </DialogHeader>

        {batch && (
          <div className="bg-muted p-3 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{batch.batchNumber}</span>
              <Badge variant="outline">{currentStageName}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {typeof batch.finishedGood === 'object' ? getLocalizedName(batch.finishedGood.name) : batch.finishedGood}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Quantity (Read-only) */}
          <div className="space-y-2">
            <Label>Input Quantity</Label>
            <Input 
              type="number" 
              value={inputQuantity} 
              disabled 
              className="bg-muted"
            />
          </div>

          {/* Output Quantity */}
          <div className="space-y-2">
            <Label htmlFor="outputQuantity">
              Output Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="outputQuantity"
              type="number"
              min="0"
              max={inputQuantity}
              placeholder="Enter output quantity"
              value={formData.outputQuantity}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, outputQuantity: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {inputQuantity} (input quantity)
            </p>
          </div>

          {/* Rejected Quantity */}
          <div className="space-y-2">
            <Label htmlFor="rejectedQuantity">Rejected / Loss Quantity</Label>
            <Input
              id="rejectedQuantity"
              type="number"
              min="0"
              placeholder="Enter rejected quantity"
              value={formData.rejectedQuantity}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, rejectedQuantity: e.target.value }))
              }
            />
          </div>

          {/* Workers */}
          <div className="space-y-2">
            <Label>Workers</Label>
            <Select
              value={formData.selectedWorkers[0] || ''}
              onValueChange={(value) => toggleWorker(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select workers..." />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker._id} value={worker._id}>
                    {getLocalizedName(worker.name)} ({worker.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.selectedWorkers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.selectedWorkers.map((workerId) => {
                  const worker = workers.find(w => w._id === workerId);
                  return (
                    <Badge 
                      key={workerId} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleWorker(workerId)}
                    >
                      {getLocalizedName(worker?.name) || workerId} ×
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Any notes about this stage..."
              value={formData.notes}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Stage
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
