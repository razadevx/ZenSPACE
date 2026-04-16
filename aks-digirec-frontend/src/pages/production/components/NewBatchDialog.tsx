import { useState, useEffect } from 'react';
import { Plus, Loader2, Package, Factory, Flame, Flower2, Sticker, Box } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getLocalizedName } from '@/lib/utils';
import { finishedGoodApi, rawMaterialApi, sectionApi } from '@/api/services';
import { productionApi } from '@/api/services';
import type { FinishedGood, RawMaterial, Section } from '@/types';

interface NewBatchDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STAGES = [
  { id: 'clay', name: 'Clay Forming', icon: Package },
  { id: 'glaze', name: 'Glaze & Color', icon: Factory },
  { id: 'kiln', name: 'Kiln Firing', icon: Flame },
  { id: 'flower', name: 'Flower Application', icon: Flower2 },
  { id: 'sticker', name: 'Sticker Application', icon: Sticker },
  { id: 'packing', name: 'Packing', icon: Box },
];

export function NewBatchDialog({ open, onClose, onSuccess }: NewBatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [formData, setFormData] = useState({
    finishedGood: '',
    targetQuantity: '',
    expectedCompletion: '',
    notes: '',
    selectedStages: ['clay', 'glaze', 'kiln', 'flower', 'sticker', 'packing'],
    materials: [{ material: '', quantity: '' }],
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [fgData, rmData, sectionsData] = await Promise.all([
        finishedGoodApi.getAll(),
        rawMaterialApi.getAll(),
        sectionApi.getAll(),
      ]);
      setFinishedGoods(fgData || []);
      setRawMaterials(rmData || []);
      setSections(sectionsData || []);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.finishedGood || !formData.targetQuantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Map stages to production stages using sections
      const stages = formData.selectedStages.map((stageId) => {
        const stageDef = STAGES.find(s => s.id === stageId);
        // Find a section that matches this stage group
        const matchingSection = sections.find(s => 
          s.sectionGroup.toLowerCase().includes(stageId) ||
          s.mainSection.toLowerCase().includes(stageId)
        );
        
        return {
          stage: matchingSection?._id || '',
          name: getLocalizedName(stageDef?.name) || stageId,
        };
      }).filter(s => s.stage); // Only include stages with valid sections

      if (stages.length === 0) {
        toast.error('No valid production stages found. Please set up sections first.');
        setIsLoading(false);
        return;
      }

      const materialsConsumed = formData.materials
        .filter(m => m.material && m.quantity)
        .map(m => ({
          material: m.material,
          quantity: parseFloat(m.quantity),
        }));

      await productionApi.createProductionBatch({
        finishedGood: formData.finishedGood,
        targetQuantity: parseInt(formData.targetQuantity),
        expectedCompletion: formData.expectedCompletion || undefined,
        notes: formData.notes || undefined,
        stages,
        materialsConsumed,
      });

      toast.success('Production batch created successfully');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create batch');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      finishedGood: '',
      targetQuantity: '',
      expectedCompletion: '',
      notes: '',
      selectedStages: ['clay', 'glaze', 'kiln', 'flower', 'sticker', 'packing'],
      materials: [{ material: '', quantity: '' }],
    });
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { material: '', quantity: '' }],
    }));
  };

  const removeMaterial = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== indexToRemove),
    }));
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  };

  const toggleStage = (stageId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStages: prev.selectedStages.includes(stageId)
        ? prev.selectedStages.filter(id => id !== stageId)
        : [...prev.selectedStages, stageId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Production Batch
          </DialogTitle>
          <DialogDescription>
            Create a new production batch with stages and materials
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="finishedGood">
              Product <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.finishedGood}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, finishedGood: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {finishedGoods.map((fg) => (
                  <SelectItem key={fg._id} value={fg._id}>
                    {getLocalizedName(fg.name)} ({fg.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="targetQuantity">
              Target Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="targetQuantity"
              type="number"
              min="1"
              placeholder="Enter target quantity"
              value={formData.targetQuantity}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, targetQuantity: e.target.value }))
              }
            />
          </div>

          {/* Expected Completion */}
          <div className="space-y-2">
            <Label htmlFor="expectedCompletion">Expected Completion</Label>
            <Input
              id="expectedCompletion"
              type="date"
              value={formData.expectedCompletion}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, expectedCompletion: e.target.value }))
              }
            />
          </div>

          {/* Production Stages */}
          <div className="space-y-2">
            <Label>Production Stages</Label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((stage) => {
                const Icon = stage.icon;
                const isSelected = formData.selectedStages.includes(stage.id);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => toggleStage(stage.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-input'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{stage.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Materials Required</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
            </div>
            <div className="space-y-2">
              {formData.materials.map((material, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={material.material}
                    onValueChange={(value) => updateMaterial(index, 'material', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((rm) => (
                        <SelectItem key={rm._id} value={rm._id}>
                          {getLocalizedName(rm.name)} ({rm.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qty"
                    className="w-24"
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                  />
                  {formData.materials.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMaterial(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Any additional notes..."
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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Batch
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
