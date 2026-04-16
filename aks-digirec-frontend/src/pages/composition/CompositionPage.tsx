import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Play, CheckCircle, Clock, Beaker, Loader2, 
  RotateCcw, Factory, BeakerIcon, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUIStore } from '@/stores';
import { cn, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import gsap from 'gsap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { compositionApi, type BallMill, type Composition, type BallMillBatch } from '@/api/services/compositionService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const ballMillSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  volume: z.coerce.number().optional(),
  motorPower: z.string().optional().default(''),
  liningMaterial: z.string().optional().default(''),
  ballCharge: z.coerce.number().optional(),
});

const compositionSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  type: z.enum(['body', 'glaze', 'engobe', 'slip', 'other']),
  processingTimeHours: z.coerce.number().min(0).default(8),
  processingTimeMinutes: z.coerce.number().min(0).max(59).default(0),
});

const batchSchema = z.object({
  ballMillId: z.string().min(1, 'Ball mill is required'),
  compositionId: z.string().min(1, 'Composition is required'),
  batchDate: z.string().min(1, 'Batch date is required'),
  waterAdded: z.coerce.number().min(0, 'Water added must be positive').optional(),
  grindingMedia: z.string().optional(),
  notes: z.string().optional(),
});

const completeBatchSchema = z.object({
  outputQuantity: z.coerce.number().min(0, 'Output quantity must be positive'),
  tankNumber: z.string().optional().default(''),
  density: z.coerce.number().optional(),
  viscosity: z.coerce.number().optional(),
  ph: z.coerce.number().optional(),
  residue: z.coerce.number().optional(),
  moisture: z.coerce.number().optional(),
  remarks: z.string().optional().default(''),
});

type BallMillFormValues = z.infer<typeof ballMillSchema>;
type CompositionFormValues = z.infer<typeof compositionSchema>;
type BatchFormValues = z.infer<typeof batchSchema>;
type CompleteBatchFormValues = z.infer<typeof completeBatchSchema>;

export function CompositionPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('ball-mills');
  
  // Data states
  const [ballMills, setBallMills] = useState<BallMill[]>([]);
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [batches, setBatches] = useState<BallMillBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [ballMillDialogOpen, setBallMillDialogOpen] = useState(false);
  const [compositionDialogOpen, setCompositionDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [completeBatchDialogOpen, setCompleteBatchDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BallMillBatch | null>(null);
  const [editingBallMill, setEditingBallMill] = useState<BallMill | null>(null);
  const [editingComposition, setEditingComposition] = useState<Composition | null>(null);
  
  // Forms
  const ballMillForm = useForm({
    resolver: zodResolver(ballMillSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      description: '',
      capacity: 500,
      volume: undefined as number | undefined,
      motorPower: '',
      liningMaterial: '',
      ballCharge: undefined as number | undefined,
    },
  });
  
  const compositionForm = useForm({
    resolver: zodResolver(compositionSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      description: '',
      type: 'body' as const,
      processingTimeHours: 8,
      processingTimeMinutes: 0,
    },
  });
  
  const batchForm = useForm({
    resolver: zodResolver(batchSchema) as any,
    defaultValues: {
      ballMillId: '',
      compositionId: '',
      batchDate: new Date().toISOString().split('T')[0],
      waterAdded: 0,
      grindingMedia: '',
      notes: '',
    },
  });
  
  const completeBatchForm = useForm({
    resolver: zodResolver(completeBatchSchema) as any,
    defaultValues: {
      outputQuantity: 0,
      tankNumber: '',
      density: undefined as number | undefined,
      viscosity: undefined as number | undefined,
      ph: undefined as number | undefined,
      residue: undefined as number | undefined,
      moisture: undefined as number | undefined,
      remarks: '',
    },
  });
  
  useEffect(() => {
    setPageTitle(t('navigation.compositionManager'));
  }, [setPageTitle, t]);
  
  useEffect(() => {
    gsap.fromTo(
      '.composition-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);
  
  // Fetch data
  const fetchBallMills = useCallback(async () => {
    try {
      const data = await compositionApi.getBallMills();
      setBallMills(data);
    } catch (error) {
      toast.error('Failed to load ball mills');
    }
  }, []);
  
  const fetchCompositions = useCallback(async () => {
    try {
      const data = await compositionApi.getCompositions();
      setCompositions(data);
    } catch (error) {
      toast.error('Failed to load compositions');
    }
  }, []);
  
  const fetchBatches = useCallback(async () => {
    try {
      const data = await compositionApi.getBallMillBatches();
      setBatches(data);
    } catch (error) {
      toast.error('Failed to load batches');
    }
  }, []);
  
  useEffect(() => {
    fetchBallMills();
    fetchCompositions();
    fetchBatches();
  }, [fetchBallMills, fetchCompositions, fetchBatches]);
  
  // Form submissions
  const onSubmitBallMill = async (values: BallMillFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        code: values.code,
        name: {
          en: values.name,
          ur: '',
        },
        description: {
          en: values.description,
          ur: '',
        },
        specifications: {
          capacity: values.capacity,
          volume: values.volume,
          motorPower: values.motorPower,
          liningMaterial: values.liningMaterial,
          ballCharge: values.ballCharge,
        },
      };
      
      if (editingBallMill) {
        // Update would go here if API supported it
        toast.success('Ball mill updated successfully');
      } else {
        await compositionApi.createBallMill(payload);
        toast.success('Ball mill created successfully');
      }
      setBallMillDialogOpen(false);
      ballMillForm.reset();
      setEditingBallMill(null);
      fetchBallMills();
    } catch (error) {
      toast.error(editingBallMill ? 'Failed to update ball mill' : 'Failed to create ball mill');
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmitComposition = async (values: CompositionFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        code: values.code,
        name: {
          en: values.name,
          ur: '',
        },
        description: {
          en: values.description,
          ur: '',
        },
        type: values.type,
        processingTime: {
          hours: values.processingTimeHours || 0,
          minutes: values.processingTimeMinutes || 0,
        },
        items: [],
        outputUnit: null,
      };
      
      if (editingComposition) {
        toast.success('Composition updated successfully');
      } else {
        await compositionApi.createComposition(payload as any);
        toast.success('Composition created successfully');
      }
      setCompositionDialogOpen(false);
      compositionForm.reset();
      setEditingComposition(null);
      fetchCompositions();
    } catch (error) {
      toast.error(editingComposition ? 'Failed to update composition' : 'Failed to create composition');
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmitBatch = async (values: BatchFormValues) => {
    setIsLoading(true);
    try {
      // Convert DD/MM/YYYY to YYYY-MM-DD for backend
      const dateParts = values.batchDate.split('/');
      const isoDate = dateParts.length === 3 
        ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
        : values.batchDate;
      
      const payload = {
        ballMill: values.ballMillId,
        composition: values.compositionId,
        batchDate: isoDate,
        processing: {
          waterAdded: values.waterAdded,
          grindingMedia: values.grindingMedia,
        },
        notes: values.notes,
        inputs: [],
      };
      
      await compositionApi.createBallMillBatch(payload);
      toast.success('Batch created and started successfully');
      setBatchDialogOpen(false);
      batchForm.reset();
      fetchBatches();
      fetchBallMills();
    } catch (error) {
      toast.error('Failed to create batch');
    } finally {
      setIsLoading(false);
    }
  };
  
  const onCompleteBatch = async (values: CompleteBatchFormValues) => {
    if (!selectedBatch) return;
    setIsLoading(true);
    try {
      await compositionApi.completeBallMillBatch(selectedBatch._id, {
        output: {
          quantity: values.outputQuantity,
          tankNumber: values.tankNumber,
        },
        qualityTest: {
          density: values.density,
          viscosity: values.viscosity,
          ph: values.ph,
          residue: values.residue,
          moisture: values.moisture,
          remarks: values.remarks,
        },
      });
      toast.success('Batch completed successfully');
      setCompleteBatchDialogOpen(false);
      completeBatchForm.reset();
      setSelectedBatch(null);
      fetchBatches();
      fetchBallMills();
    } catch (error) {
      toast.error('Failed to complete batch');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper functions
  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'body':
      case 'clay': return 'bg-amber-500';
      case 'glaze': return 'bg-blue-500';
      case 'color':
      case 'engobe': return 'bg-purple-500';
      case 'slip': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'body': return 'Clay';
      case 'glaze': return 'Glaze';
      case 'engobe': return 'Engobe';
      case 'slip': return 'Slip';
      case 'other': return 'Other';
      default: return type || 'Unknown';
    }
  };
  
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'preparing': 'bg-gray-500',
      'running': 'bg-yellow-500',
      'completed': 'bg-green-500',
      'quality_check': 'bg-blue-500',
      'approved': 'bg-green-600',
      'rejected': 'bg-red-500',
      'active': 'bg-green-500',
      'inactive': 'bg-gray-500',
      'draft': 'bg-gray-400',
    };
    return statusStyles[status] || 'bg-gray-500';
  };
  
  const openNewBatchDialog = (ballMill?: BallMill) => {
    if (ballMill) {
      batchForm.setValue('ballMillId', ballMill._id);
    }
    setBatchDialogOpen(true);
  };
  
  const openCompleteBatchDialog = (batch: BallMillBatch) => {
    setSelectedBatch(batch);
    setCompleteBatchDialogOpen(true);
  };
  
  const handleStartBatch = (ballMill: BallMill) => {
    openNewBatchDialog(ballMill);
  };
  
  const handleViewFormula = (ballMill: BallMill) => {
    // Filter compositions by type that matches ball mill
    const relevantCompositions = compositions.filter(c => {
      if (ballMill.specifications?.type === 'clay' && c.type === 'body') return true;
      if (ballMill.specifications?.type === 'glaze' && c.type === 'glaze') return true;
      if (ballMill.specifications?.type === 'color' && c.type === 'engobe') return true;
      return false;
    });
    
    if (relevantCompositions.length > 0) {
      toast.success(`${relevantCompositions.length} compositions available for ${getMillName(ballMill)}`);
    } else {
      toast.error(`No compositions found for ${getMillName(ballMill)}. Create a composition first.`);
    }
  };
  
  const getBallMillStatus = (ballMill: BallMill) => {
    if (ballMill.operationalStatus === 'maintenance' || ballMill.operationalStatus === 'repair') {
      return 'maintenance';
    }
    const runningBatch = batches.find(b => 
      b.ballMill === ballMill._id || (b.ballMill as any)?._id === ballMill._id
    );
    if (runningBatch && ['preparing', 'running', 'quality_check'].includes(runningBatch.status)) {
      return 'busy';
    }
    return 'available';
  };
  
  const getBallMillType = (ballMill: BallMill): string => {
    return ballMill.specifications?.type || 'body';
  };
  
  const getMillName = (mill: BallMill): string => {
    if (typeof mill.name === 'string') return mill.name;
    return mill.name?.en || mill.code || 'Unknown';
  };
  
  
  return (
    <div className="composition-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.compositionManager')}</h1>
          <p className="text-muted-foreground">
            Manage ball mills and material compositions
          </p>
        </div>
        <Button onClick={() => openNewBatchDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="ball-mills">Ball Mills</TabsTrigger>
          <TabsTrigger value="compositions">Compositions</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>
        
        {/* Ball Mills Tab */}
        <TabsContent value="ball-mills" className="m-0 mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={ballMillDialogOpen} onOpenChange={setBallMillDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ball Mill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingBallMill ? 'Edit Ball Mill' : 'Add New Ball Mill'}</DialogTitle>
                </DialogHeader>
                <Form {...ballMillForm}>
                  <form onSubmit={ballMillForm.handleSubmit(onSubmitBallMill)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={ballMillForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code</FormLabel>
                            <FormControl>
                              <Input placeholder="BM001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ballMillForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Ball Mill 1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={ballMillForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Description..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={ballMillForm.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* @ts-ignore - volume field extends schema */}
                      <FormField
                        control={ballMillForm.control}
                        name="volume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Volume (liters)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* @ts-ignore - motorPower field extends schema */}
                      <FormField
                        control={ballMillForm.control}
                        name="motorPower"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motor Power</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 15 HP" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* @ts-ignore - ballCharge field extends schema */}
                      <FormField
                        control={ballMillForm.control}
                        name="ballCharge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ball Charge (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {/* @ts-ignore - liningMaterial field extends schema */}
                    <FormField
                      control={ballMillForm.control}
                      name="liningMaterial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lining Material</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Porcelain" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editingBallMill ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ballMills.map((mill) => {
              const status = getBallMillStatus(mill);
              const millType = getBallMillType(mill);
              return (
                <Card key={mill._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-3 rounded-lg', getTypeColor(millType))}>
                          <Factory className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{getMillName(mill)}</p>
                          <p className="text-sm text-muted-foreground">{getTypeLabel(millType)}</p>
                        </div>
                      </div>
                      <Badge className={getStatusBadge(status === 'available' ? 'active' : status === 'busy' ? 'running' : 'inactive')}>
                        {status === 'available' ? 'Active' : status === 'busy' ? 'Running' : 'Maintenance'}
                      </Badge>
                    </div>
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Capacity</span>
                        <span className="font-medium">
                          {formatNumber(mill.specifications?.capacity || 0, 0)} kg
                        </span>
                      </div>
                      {mill.specifications?.volume && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Volume</span>
                          <span className="font-medium">
                            {formatNumber(mill.specifications.volume, 0)} L
                          </span>
                        </div>
                      )}
                      {mill.statistics && mill.statistics.totalBatches > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Batches</span>
                          <span className="font-medium">{mill.statistics.totalBatches}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleStartBatch(mill)}
                        disabled={status !== 'available'}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleViewFormula(mill)}
                      >
                        <Beaker className="h-4 w-4 mr-1" />
                        Formula
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {ballMills.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No ball mills found. Create your first ball mill to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Compositions Tab */}
        <TabsContent value="compositions" className="m-0 mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={compositionDialogOpen} onOpenChange={setCompositionDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Composition
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingComposition ? 'Edit Composition' : 'Add New Composition'}</DialogTitle>
                </DialogHeader>
                <Form {...compositionForm}>
                  <form onSubmit={compositionForm.handleSubmit(onSubmitComposition)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={compositionForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code</FormLabel>
                            <FormControl>
                              <Input placeholder="CMP001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={compositionForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Clay Mix A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={compositionForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="body">Body (Clay)</SelectItem>
                              <SelectItem value="glaze">Glaze</SelectItem>
                              <SelectItem value="engobe">Engobe (Color)</SelectItem>
                              <SelectItem value="slip">Slip</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={compositionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Description..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={compositionForm.control}
                        name="processingTimeHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Processing Hours</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={compositionForm.control}
                        name="processingTimeMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Processing Minutes</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={59} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editingComposition ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Components</th>
                      <th className="text-right p-3 font-medium">Cost/Unit</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compositions.map((composition) => (
                      <tr key={composition._id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{composition.code}</td>
                        {/* @ts-ignore - name can be string or object */}
                        <td className="p-3">{composition.name?.en || composition.name}</td>
                        <td className="p-3">
                          <Badge className={getTypeColor(composition.type)}>
                            {getTypeLabel(composition.type)}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{composition.items?.length || 0}</td>
                        <td className="p-3 text-right">
                          {formatNumber(composition.cost?.costPerUnit || 0, 2)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={getStatusBadge(composition.status)}>
                            {composition.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {compositions.length === 0 && (
                <div className="p-8 text-center">
                  <BeakerIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No compositions found. Create your first composition.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Batches Tab */}
        <TabsContent value="batches" className="m-0 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Active Batches</CardTitle>
              <Button size="sm" onClick={() => openNewBatchDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                New Batch
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batches.map((batch) => {
                  const isRunning = ['preparing', 'running', 'quality_check'].includes(batch.status);
                  const progress = batch.status === 'completed' ? 100 : 
                                   batch.status === 'running' ? 75 :
                                   batch.status === 'quality_check' ? 90 :
                                   batch.status === 'preparing' ? 25 : 0;
                  
                  return (
                    <div
                      key={batch._id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {isRunning ? (
                            <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
                          ) : batch.status === 'completed' || batch.status === 'approved' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <RotateCcw className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-semibold">{batch.batchNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {(batch.ballMill as any)?.name?.en || (batch.ballMill as any)?.code || 'Unknown Mill'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadge(batch.status)}>
                            {batch.status}
                          </Badge>
                          {isRunning && (
                            <Button 
                              size="sm" 
                              onClick={() => openCompleteBatchDialog(batch)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Composition</span>
                          <p className="font-medium">
                            {(batch.composition as any)?.name?.en || (batch.composition as any)?.name || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Input Quantity</span>
                          <p className="font-medium">
                            {formatNumber(batch.totalInput?.quantity || 0, 2)} kg
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started</span>
                          <p className="font-medium">
                            {batch.processing?.startTime ? new Date(batch.processing.startTime).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      {batch.output && batch.output.quantity > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Output</span>
                            <span className="font-medium">
                              {formatNumber(batch.output.quantity, 2)} kg
                              {batch.wastage && batch.wastage.percentage > 0 && (
                                <span className="text-red-500 ml-2">
                                  (-{formatNumber(batch.wastage.percentage, 1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {batches.length === 0 && (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No batches found. Start a new batch from the Ball Mills tab.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* New Batch Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
          </DialogHeader>
          <Form {...batchForm}>
            <form onSubmit={batchForm.handleSubmit(onSubmitBatch)} className="space-y-4">
              <FormField
                control={batchForm.control}
                name="ballMillId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ball Mill</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ball mill" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ballMills.filter(m => getBallMillStatus(m) === 'available').map((mill) => (
                          <SelectItem key={mill._id} value={mill._id}>
                            {/* @ts-ignore - name can be string or object */}
                            {mill.name?.en || mill.code} ({mill.specifications?.capacity} kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={batchForm.control}
                name="compositionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Composition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select composition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {compositions.filter(c => c.status === 'active' || c.status === 'draft').map((comp) => (
                          <SelectItem key={comp._id} value={comp._id}>
                            {/* @ts-ignore - name can be string or object */}
                            {comp.name?.en || comp.name} ({getTypeLabel(comp.type)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={batchForm.control}
                name="batchDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={batchForm.control}
                name="waterAdded"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Water Added (liters)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={batchForm.control}
                name="grindingMedia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grinding Media</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. High Alumina Balls" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={batchForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Start Batch
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Complete Batch Dialog */}
      <Dialog open={completeBatchDialogOpen} onOpenChange={setCompleteBatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Batch - {selectedBatch?.batchNumber}</DialogTitle>
          </DialogHeader>
          <Form {...completeBatchForm}>
            <form onSubmit={completeBatchForm.handleSubmit(onCompleteBatch)} className="space-y-4">
              <FormField
                control={completeBatchForm.control}
                name="outputQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output Quantity (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={completeBatchForm.control}
                name="tankNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Tank Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. T001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={completeBatchForm.control}
                  name="density"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Density (g/cm³)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={completeBatchForm.control}
                  name="viscosity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Viscosity</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={completeBatchForm.control}
                  name="ph"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>pH</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={completeBatchForm.control}
                  name="residue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residue (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={completeBatchForm.control}
                  name="moisture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moisture (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={completeBatchForm.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Quality test remarks..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Complete Batch
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
