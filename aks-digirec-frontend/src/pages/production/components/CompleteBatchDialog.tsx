import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Trophy } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNumber, getLocalizedName } from '@/lib/utils';

interface CompleteBatchDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batch: ProductionBatch | null;
}

export function CompleteBatchDialog({ open, onClose, onSuccess, batch }: CompleteBatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    approvedQuantity: '',
    rejectedQuantity: '',
    qualityGrade: 'A' as 'A' | 'B' | 'C' | 'Reject',
    remarks: '',
  });

  // Calculate final output from last completed stage
  const lastCompletedStage = batch?.stages?.slice().reverse().find(s => s.status === 'completed');
  const expectedOutput = lastCompletedStage?.outputQuantity || batch?.targetQuantity || 0;

  useEffect(() => {
    if (open && batch) {
      setFormData({
        approvedQuantity: expectedOutput.toString(),
        rejectedQuantity: (batch.loss?.totalLoss || 0).toString(),
        qualityGrade: 'A',
        remarks: '',
      });
    }
  }, [open, batch, expectedOutput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batch) {
      toast.error('No batch selected');
      return;
    }

    if (!formData.approvedQuantity) {
      toast.error('Please enter approved quantity');
      return;
    }

    const approved = parseInt(formData.approvedQuantity);
    const rejected = parseInt(formData.rejectedQuantity) || 0;
    const total = approved + rejected;

    // Validate that total doesn't exceed expected output by too much
    if (total > expectedOutput * 1.1) {
      toast.error(`Total quantity (${total}) exceeds expected output (${expectedOutput}) by more than 10%`);
      return;
    }

    setIsLoading(true);
    try {
      await productionApi.completeProductionBatch(
        batch._id,
        {
          actualOutput: {
            quantity: total,
            approved,
            rejected,
          },
          quality: {
            grade: formData.qualityGrade,
            remarks: formData.remarks,
          },
        }
      );

      toast.success('Production batch completed successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete batch');
    } finally {
      setIsLoading(false);
    }
  };

  const approvedQty = parseInt(formData.approvedQuantity) || 0;
  const rejectedQty = parseInt(formData.rejectedQuantity) || 0;
  const totalOutput = approvedQty + rejectedQty;
  const lossPercentage = expectedOutput > 0 
    ? ((expectedOutput - approvedQty) / expectedOutput * 100).toFixed(1)
    : '0';

  if (!batch) return null;

  const finishedGoodName = typeof batch.finishedGood === 'object' 
    ? getLocalizedName(batch.finishedGood.name) 
    : getLocalizedName(batch.finishedGood);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Complete Production Batch
          </DialogTitle>
          <DialogDescription>
            Finalize production and record the actual output
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-3 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{batch.batchNumber}</span>
            <Badge variant="outline">{finishedGoodName}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Target: {formatNumber(batch.targetQuantity, 0)} • 
            Last Stage Output: {formatNumber(expectedOutput, 0)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Approved Quantity */}
          <div className="space-y-2">
            <Label htmlFor="approvedQuantity">
              Approved Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="approvedQuantity"
              type="number"
              min="0"
              placeholder="Enter approved quantity"
              value={formData.approvedQuantity}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, approvedQuantity: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Good quality items ready for inventory
            </p>
          </div>

          {/* Rejected Quantity */}
          <div className="space-y-2">
            <Label htmlFor="rejectedQuantity">Rejected / Damaged Quantity</Label>
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

          {/* Quality Grade */}
          <div className="space-y-2">
            <Label htmlFor="qualityGrade">Quality Grade</Label>
            <Select
              value={formData.qualityGrade}
              onValueChange={(value: 'A' | 'B' | 'C' | 'Reject') => 
                setFormData(prev => ({ ...prev, qualityGrade: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quality grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Grade A - Premium</SelectItem>
                <SelectItem value="B">Grade B - Standard</SelectItem>
                <SelectItem value="C">Grade C - Economy</SelectItem>
                <SelectItem value="Reject">Reject - Not Saleable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Output:</span>
              <span className="font-medium">{formatNumber(totalOutput, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected from Last Stage:</span>
              <span className="font-medium">{formatNumber(expectedOutput, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Effective Loss:</span>
              <span className={`font-medium ${parseFloat(lossPercentage) > 10 ? 'text-red-500' : 'text-green-500'}`}>
                {lossPercentage}%
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Quality Remarks</Label>
            <Input
              id="remarks"
              placeholder="Any quality observations..."
              value={formData.remarks}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, remarks: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || approvedQty === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Batch
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
