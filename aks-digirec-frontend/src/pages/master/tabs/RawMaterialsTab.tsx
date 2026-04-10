import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/custom/DataTable';
import { DeleteDialog } from '@/components/custom/DeleteDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { RawMaterial } from '@/types';
import { rawMaterialApi } from '@/api/services';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const materialTypes = [
  { value: 'Clay Material', label: 'Clay Material' },
  { value: 'Glaze Material', label: 'Glaze Material' },
  { value: 'Color Material', label: 'Color Material' },
  { value: 'Flower Material', label: 'Flower Material' },
  { value: 'Sticker Material', label: 'Sticker Material' },
  { value: 'Packing Material', label: 'Packing Material' },
  { value: 'Dyeing Material', label: 'Dyeing Material' },
  { value: 'Mould Material', label: 'Mould Material' },
  { value: 'Other', label: 'Other' },
];

const units = [
  { value: 'Kg', label: 'Kg' },
  { value: 'Liters', label: 'Liters' },
  { value: 'Pieces', label: 'Pieces' },
  { value: 'Bags', label: 'Bags' },
  { value: 'Boxes', label: 'Boxes' },
];

const initialFormState = {
  materialType: '',
  name: '',
  unit: '',
  stock: '',
  amount: '',
  minStock: '',
  maxStock: '',
  details: '',
};

interface RawMaterialsTabProps {
  searchQuery: string;
}

export function RawMaterialsTab({ searchQuery }: RawMaterialsTabProps) {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchMaterials = async () => {
    try {
      const data = await rawMaterialApi.getAll();
      setMaterials(data);
    } catch (error: any) {
      toast.error('Failed to load materials: ' + error.message);
    }
  };
  
  useEffect(() => {
    fetchMaterials();
  }, []);
  
  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      materialType: material.materialType || '',
      name: material.name || '',
      unit: material.unit || '',
      stock: material.stock?.toString() || '',
      amount: material.amount?.toString() || '',
      minStock: material.minStock?.toString() || '',
      maxStock: material.maxStock?.toString() || '',
      details: material.details || '',
    });
    setErrors({});
  };
  
  const handleDelete = (material: RawMaterial) => {
    setDeletingMaterial(material);
    setIsDeleteOpen(true);
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.materialType) newErrors.materialType = 'Material Type is required';
    if (!formData.name) newErrors.name = 'Material Name is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    if (!formData.stock) newErrors.stock = 'Opening Stock is required';
    if (!formData.amount) newErrors.amount = 'Total Amount is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    const submitData = {
      ...formData,
      stock: Number(formData.stock),
      amount: Number(formData.amount),
      minStock: formData.minStock ? Number(formData.minStock) : undefined,
      maxStock: formData.maxStock ? Number(formData.maxStock) : undefined,
    };
    
    try {
      if (editingMaterial) {
        await rawMaterialApi.update(editingMaterial._id, submitData);
        toast.success('Material updated successfully');
      } else {
        await rawMaterialApi.create(submitData);
        toast.success('Material created successfully');
      }
      setFormData(initialFormState);
      setEditingMaterial(null);
      setErrors({});
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save material');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingMaterial(null);
    setErrors({});
  };
  
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingMaterial) return;
    try {
      await rawMaterialApi.delete(deletingMaterial._id);
      toast.success('Material deleted successfully');
      setIsDeleteOpen(false);
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete material');
    }
  };
  
  const getStockStatus = (stock: number, min: number, max: number) => {
    if (stock <= min) return { label: 'Low', color: 'bg-red-500' };
    if (stock >= max) return { label: 'High', color: 'bg-blue-500' };
    return { label: 'Normal', color: 'bg-green-500' };
  };
  
  const columns: ColumnDef<RawMaterial>[] = [
    { accessorKey: 'code', header: t('common.code') },
    { accessorKey: 'materialType', header: t('masterData.materialType') },
    { accessorKey: 'name', header: t('masterData.materialName') },
    { accessorKey: 'unit', header: t('masterData.unit') },
    { accessorKey: 'stock', header: t('common.stock'), cell: ({ row }) => formatNumber(row.original.stock, 0) },
    { accessorKey: 'rate', header: t('common.rate'), cell: ({ row }) => formatCurrency(row.original.rate) },
    { accessorKey: 'amount', header: t('common.amount'), cell: ({ row }) => formatCurrency(row.original.amount) },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = getStockStatus(row.original.stock, row.original.minStock, row.original.maxStock);
        return <Badge className={cn(status.color, 'text-white')}>{status.label}</Badge>;
      },
    },
  ];
  
  const filteredMaterials = materials.filter(
    (m) =>
      (m.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.materialType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex gap-6">
      {/* Form on Left Side - 1/4 width */}
      <Card className="w-1/4 min-w-[280px]">
        <CardHeader>
          <CardTitle className="text-lg">
            {editingMaterial ? 'Edit Material' : 'Add Material'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="materialType">
                Material Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.materialType}
                onValueChange={(value) => handleChange('materialType', value)}
              >
                <SelectTrigger className={cn(errors.materialType && 'border-destructive')}>
                  <SelectValue placeholder="Select Material Type" />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.materialType && <p className="text-sm text-destructive">{errors.materialType}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">
                Material Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., White Clay"
                className={cn(errors.name && 'border-destructive')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">
                Unit <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => handleChange('unit', value)}
              >
                <SelectTrigger className={cn(errors.unit && 'border-destructive')}>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-sm text-destructive">{errors.unit}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock">
                Opening Stock <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => handleChange('stock', e.target.value)}
                placeholder="0"
                className={cn(errors.stock && 'border-destructive')}
              />
              {errors.stock && <p className="text-sm text-destructive">{errors.stock}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">
                Total Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0"
                className={cn(errors.amount && 'border-destructive')}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input
                id="minStock"
                type="number"
                value={formData.minStock}
                onChange={(e) => handleChange('minStock', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxStock">Max Stock</Label>
              <Input
                id="maxStock"
                type="number"
                value={formData.maxStock}
                onChange={(e) => handleChange('maxStock', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="details">Details</Label>
              <textarea
                id="details"
                value={formData.details}
                onChange={(e) => handleChange('details', e.target.value)}
                placeholder="Optional details"
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
          <CardTitle>{t('masterData.rawMaterials')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredMaterials}
            searchKey="name"
            searchPlaceholder="Search materials..."
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
        title="Delete Material"
        description="Are you sure you want to delete this material? This action cannot be undone."
        itemName={deletingMaterial?.name}
      />
    </div>
  );
}
