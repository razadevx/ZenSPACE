import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/custom/DataTable';
import { DeleteDialog } from '@/components/custom/DeleteDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { Worker } from '@/types';
import { workerApi, workersApi } from '@/api/services';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const workerTypes = [
  { value: 'Per Piece', label: 'Per Piece' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Office', label: 'Office' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Other', label: 'Other' },
];

const wageTypes = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'piece_rate', label: 'Piece Rate' },
];

const initialFormState = {
  name: '',
  workerType: '',
  sectionGroup: '',
  fatherName: '',
  cnic: '',
  cellNumber: '',
  city: '',
  advanceFixed: '',
  notes: '',
  // Wage fields
  wageType: '',
  wageAmount: '',
  overtimeRate: '',
};

interface WorkersTabProps {
  searchQuery: string;
}

export function WorkersTab({ searchQuery }: WorkersTabProps) {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sectionGroupOptions, setSectionGroupOptions] = useState<{ value: string; label: string }[]>([]);

  const fetchWorkers = async () => {
    try {
      const data = await workerApi.getAll();
      setWorkers(data);
    } catch (error: any) {
      toast.error('Failed to load workers: ' + error.message);
    }
  };

  const fetchSectionGroups = async () => {
    try {
      const groups = await workersApi.getSectionGroups();
      setSectionGroupOptions(groups.map(g => ({ value: g.id, label: g.label })));
    } catch {
      // Fallback to common groups if API fails
      setSectionGroupOptions([
        { value: 'Clay Group', label: 'Clay Group' },
        { value: 'Glaze & Color Group', label: 'Glaze & Color Group' },
        { value: 'Kiln Group', label: 'Kiln Group' },
        { value: 'Flower Group', label: 'Flower Group' },
        { value: 'Sticker Group', label: 'Sticker Group' },
        { value: 'Packing Group', label: 'Packing Group' },
      ]);
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchSectionGroups();
  }, []);
  
  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name || '',
      workerType: worker.workerType || '',
      sectionGroup: worker.sectionGroup || '',
      fatherName: worker.fatherName || '',
      cnic: worker.cnic || '',
      cellNumber: worker.cellNumber || '',
      city: worker.city || '',
      advanceFixed: worker.advanceFixed?.toString() || '',
      notes: worker.notes || '',
      wageType: worker.wages?.type || '',
      wageAmount: worker.wages?.amount?.toString() || '',
      overtimeRate: worker.wages?.overtimeRate?.toString() || '',
    });
    setErrors({});
  };
  
  const handleDelete = (worker: Worker) => {
    setDeletingWorker(worker);
    setIsDeleteOpen(true);
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Worker Name is required';
    if (!formData.workerType) newErrors.workerType = 'Worker Type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const submitData = {
      ...formData,
      advanceFixed: formData.advanceFixed ? Number(formData.advanceFixed) : undefined,
      wages: formData.wageType && formData.wageAmount ? {
        type: formData.wageType,
        amount: Number(formData.wageAmount),
        overtimeRate: formData.overtimeRate ? Number(formData.overtimeRate) : undefined,
        currency: 'PKR'
      } : undefined,
    };
    
    try {
      if (editingWorker) {
        await workerApi.update(editingWorker._id, submitData);
        toast.success('Worker updated successfully');
      } else {
        await workerApi.create(submitData);
        toast.success('Worker created successfully');
      }
      setFormData(initialFormState);
      setEditingWorker(null);
      setErrors({});
      fetchWorkers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save worker');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingWorker(null);
    setErrors({});
  };
  
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingWorker) return;
    try {
      await workerApi.delete(deletingWorker._id);
      toast.success('Worker deleted successfully');
      setIsDeleteOpen(false);
      fetchWorkers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete worker');
    }
  };
  
  const columns: ColumnDef<Worker>[] = [
    { accessorKey: 'code', header: t('common.code') },
    { accessorKey: 'name', header: t('common.name') },
    { accessorKey: 'fatherName', header: t('masterData.fatherName') },
    { accessorKey: 'cnic', header: t('masterData.cnic') },
    { accessorKey: 'workerType', header: t('masterData.workerType') },
    { accessorKey: 'sectionGroup', header: t('masterData.sectionGroup') },
    {
      accessorKey: 'advanceFixed',
      header: t('masterData.advance'),
      cell: ({ row }) => formatCurrency(row.original.advanceFixed),
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className={cn(row.original.status === 'active' && 'bg-green-500')}>
          {row.original.status}
        </Badge>
      ),
    },
  ];
  
  const filteredWorkers = workers.filter(
    (w) =>
      (w.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.cnic || '').includes(searchQuery)
  );
  
  return (
    <div className="flex gap-6">
      {/* Form on Left Side - 1/4 width */}
      <Card className="w-1/4 min-w-[280px]">
        <CardHeader>
          <CardTitle className="text-lg">
            {editingWorker ? 'Edit Worker' : 'Add Worker'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Worker Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Full name"
                className={cn(errors.name && 'border-destructive')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="workerType">
                Worker Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.workerType}
                onValueChange={(value) => handleChange('workerType', value)}
              >
                <SelectTrigger className={cn(errors.workerType && 'border-destructive')}>
                  <SelectValue placeholder="Select Worker Type" />
                </SelectTrigger>
                <SelectContent>
                  {workerTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.workerType && <p className="text-sm text-destructive">{errors.workerType}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sectionGroup">Section Group</Label>
              <Select
                value={formData.sectionGroup}
                onValueChange={(value) => handleChange('sectionGroup', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Section Group" />
                </SelectTrigger>
                <SelectContent>
                  {sectionGroupOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fatherName">Father Name</Label>
              <Input
                id="fatherName"
                value={formData.fatherName}
                onChange={(e) => handleChange('fatherName', e.target.value)}
                placeholder="Father's name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cnic">CNIC</Label>
              <Input
                id="cnic"
                value={formData.cnic}
                onChange={(e) => handleChange('cnic', e.target.value)}
                placeholder="12345-6789012-3"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cellNumber">Cell Number</Label>
              <Input
                id="cellNumber"
                type="tel"
                value={formData.cellNumber}
                onChange={(e) => handleChange('cellNumber', e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="advanceFixed">Fixed Advance</Label>
              <Input
                id="advanceFixed"
                type="number"
                value={formData.advanceFixed}
                onChange={(e) => handleChange('advanceFixed', e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Wage Configuration */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground mb-3">Wage Configuration</p>

              <div className="space-y-2">
                <Label htmlFor="wageType">Wage Type</Label>
                <Select
                  value={formData.wageType}
                  onValueChange={(value) => handleChange('wageType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Wage Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {wageTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="wageAmount">Wage Amount (PKR)</Label>
                <Input
                  id="wageAmount"
                  type="number"
                  value={formData.wageAmount}
                  onChange={(e) => handleChange('wageAmount', e.target.value)}
                  placeholder="e.g., 1000"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.wageType === 'hourly' && 'Per hour rate'}
                  {formData.wageType === 'daily' && 'Per day rate'}
                  {formData.wageType === 'monthly' && 'Per month salary'}
                  {formData.wageType === 'piece_rate' && 'Per piece rate'}
                </p>
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="overtimeRate">Overtime Rate (Optional)</Label>
                <Input
                  id="overtimeRate"
                  type="number"
                  value={formData.overtimeRate}
                  onChange={(e) => handleChange('overtimeRate', e.target.value)}
                  placeholder="e.g., 187.5 (1.5x of hourly)"
                />
                <p className="text-xs text-muted-foreground">Leave blank for default 1.5x rate</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Optional notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table on Right Side - 3/4 width */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>{t('masterData.workers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredWorkers}
            searchKey="name"
            searchPlaceholder="Search workers..."
            actions={(row) => [
              { label: 'Edit', onClick: () => handleEdit(row), icon: Pencil },
              { label: 'Delete', onClick: () => handleDelete(row), icon: Trash2 },
            ]}
          />
        </CardContent>
      </Card>
      
      <DeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Worker"
        description="Are you sure you want to delete this worker? This action cannot be undone."
        itemName={deletingWorker?.name}
      />
    </div>
  );
}
