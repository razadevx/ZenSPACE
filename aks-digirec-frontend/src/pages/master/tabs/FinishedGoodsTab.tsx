import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/custom/DataTable';
import { DeleteDialog } from '@/components/custom/DeleteDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { FinishedGood } from '@/types';
import { finishedGoodApi } from '@/api/services';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sizes = [
  { value: '10', label: '10' },
  { value: '8', label: '8' },
  { value: '6', label: '6' },
  { value: '5', label: '5' },
  { value: 'Bora', label: 'Bora' },
  { value: 'Other', label: 'Other' },
];

const units = [
  { value: 'Pieces', label: 'Pieces' },
  { value: 'Boxes', label: 'Boxes' },
  { value: 'Bora', label: 'Bora' },
];

const categories = [
  { value: 'Simple', label: 'Simple' },
  { value: 'Color', label: 'Color' },
  { value: 'Full Color', label: 'Full Color' },
  { value: 'Flower', label: 'Flower' },
  { value: 'Full Flower', label: 'Full Flower' },
  { value: 'Other', label: 'Other' },
];

const initialFormState = {
  name: '',
  size: '',
  unit: '',
  category: '',
  color: '',
  stock: '',
  grossWeight: '',
  grossGlaze: '',
  grossColor: '',
  costPrice: '',
  sellingPrice: '',
  minStock: '',
  maxStock: '',
};

interface FinishedGoodsTabProps {
  searchQuery: string;
}

export function FinishedGoodsTab({ searchQuery }: FinishedGoodsTabProps) {
  const { t } = useTranslation();
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinishedGood | null>(null);
  const [deletingItem, setDeletingItem] = useState<FinishedGood | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchFinishedGoods = async () => {
    try {
      const data = await finishedGoodApi.getAll();
      setFinishedGoods(data);
    } catch (error: any) {
      toast.error('Failed to load products: ' + error.message);
    }
  };
  
  useEffect(() => {
    fetchFinishedGoods();
  }, []);
  
  const handleEdit = (item: FinishedGood) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      size: item.size || '',
      unit: item.unit || '',
      category: item.category || '',
      color: item.color || '',
      stock: item.stock?.toString() || '',
      grossWeight: item.grossWeight?.toString() || '',
      grossGlaze: item.grossGlaze?.toString() || '',
      grossColor: item.grossColor?.toString() || '',
      costPrice: item.costPrice?.toString() || '',
      sellingPrice: item.sellingPrice?.toString() || '',
      minStock: item.minStock?.toString() || '',
      maxStock: item.maxStock?.toString() || '',
    });
    setErrors({});
  };
  
  const handleDelete = (item: FinishedGood) => {
    setDeletingItem(item);
    setIsDeleteOpen(true);
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Product Name is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    if (!formData.stock) newErrors.stock = 'Opening Stock is required';
    if (!formData.costPrice) newErrors.costPrice = 'Cost Price is required';
    if (!formData.sellingPrice) newErrors.sellingPrice = 'Selling Price is required';
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
      grossWeight: formData.grossWeight ? Number(formData.grossWeight) : undefined,
      grossGlaze: formData.grossGlaze ? Number(formData.grossGlaze) : undefined,
      grossColor: formData.grossColor ? Number(formData.grossColor) : undefined,
      costPrice: Number(formData.costPrice),
      sellingPrice: Number(formData.sellingPrice),
      minStock: formData.minStock ? Number(formData.minStock) : undefined,
      maxStock: formData.maxStock ? Number(formData.maxStock) : undefined,
    };
    
    try {
      if (editingItem) {
        await finishedGoodApi.update(editingItem._id, submitData);
        toast.success('Product updated successfully');
      } else {
        await finishedGoodApi.create(submitData);
        toast.success('Product created successfully');
      }
      setFormData(initialFormState);
      setEditingItem(null);
      setErrors({});
      fetchFinishedGoods();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingItem(null);
    setErrors({});
  };
  
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      await finishedGoodApi.delete(deletingItem._id);
      toast.success('Product deleted successfully');
      setIsDeleteOpen(false);
      fetchFinishedGoods();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };
  
  const getStockStatus = (stock: number, min: number, max: number) => {
    if (stock <= min) return { label: 'Low', color: 'bg-red-500' };
    if (stock >= max) return { label: 'High', color: 'bg-blue-500' };
    return { label: 'Normal', color: 'bg-green-500' };
  };
  
  const columns: ColumnDef<FinishedGood>[] = [
    { accessorKey: 'code', header: t('common.code') },
    { accessorKey: 'name', header: t('masterData.productName') },
    { accessorKey: 'size', header: t('masterData.size') },
    { accessorKey: 'category', header: t('masterData.category') },
    { accessorKey: 'color', header: t('masterData.color') },
    { accessorKey: 'stock', header: t('common.stock'), cell: ({ row }) => formatNumber(row.original.stock, 0) },
    { accessorKey: 'costPrice', header: t('masterData.costPrice'), cell: ({ row }) => formatCurrency(row.original.costPrice) },
    { accessorKey: 'sellingPrice', header: t('masterData.sellingPrice'), cell: ({ row }) => formatCurrency(row.original.sellingPrice) },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = getStockStatus(row.original.stock, row.original.minStock, row.original.maxStock);
        return <Badge className={cn(status.color, 'text-white')}>{status.label}</Badge>;
      },
    },
  ];
  
  const filteredItems = finishedGoods.filter(
    (fg) =>
      (fg.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fg.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fg.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex gap-6">
      {/* Form on Left Side - 1/4 width */}
      <Card className="w-1/4 min-w-[280px]">
        <CardHeader>
          <CardTitle className="text-lg">
            {editingItem ? 'Edit Product' : 'Add Product'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Ceramic Cup 10oz"
                className={cn(errors.name && 'border-destructive')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => handleChange('size', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Size" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="e.g., Blue, White"
              />
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
              <Label htmlFor="grossWeight">Gross Weight (g)</Label>
              <Input
                id="grossWeight"
                type="number"
                value={formData.grossWeight}
                onChange={(e) => handleChange('grossWeight', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grossGlaze">Gross Glaze (g)</Label>
              <Input
                id="grossGlaze"
                type="number"
                value={formData.grossGlaze}
                onChange={(e) => handleChange('grossGlaze', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grossColor">Gross Color (g)</Label>
              <Input
                id="grossColor"
                type="number"
                value={formData.grossColor}
                onChange={(e) => handleChange('grossColor', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="costPrice">
                Cost Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="costPrice"
                type="number"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', e.target.value)}
                placeholder="0"
                className={cn(errors.costPrice && 'border-destructive')}
              />
              {errors.costPrice && <p className="text-sm text-destructive">{errors.costPrice}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">
                Selling Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => handleChange('sellingPrice', e.target.value)}
                placeholder="0"
                className={cn(errors.sellingPrice && 'border-destructive')}
              />
              {errors.sellingPrice && <p className="text-sm text-destructive">{errors.sellingPrice}</p>}
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
          <CardTitle>{t('masterData.finishedGoods')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredItems}
            searchKey="name"
            searchPlaceholder="Search products..."
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
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        itemName={deletingItem?.name}
      />
    </div>
  );
}
