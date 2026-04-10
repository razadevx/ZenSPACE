import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/custom/DataTable';
import { DeleteDialog } from '@/components/custom/DeleteDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { Supplier } from '@/types';
import { supplierApi } from '@/api/services';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const supplierTypes = [
  { value: 'Raw Material', label: 'Raw Material' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Service', label: 'Service' },
  { value: 'Other', label: 'Other' },
];

const paymentTerms = [
  { value: 'Cash', label: 'Cash' },
  { value: '7 days', label: '7 days' },
  { value: '15 days', label: '15 days' },
  { value: '30 days', label: '30 days' },
  { value: 'Custom Days', label: 'Custom Days' },
];

const initialFormState = {
  supplierType: '',
  name: '',
  contactPerson: '',
  cellNumber: '',
  email: '',
  city: '',
  paymentTerms: '',
  openingBalance: '',
  address: '',
};

interface SuppliersTabProps {
  searchQuery: string;
}

export function SuppliersTab({ searchQuery }: SuppliersTabProps) {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchSuppliers = async () => {
    try {
      const data = await supplierApi.getAll();
      setSuppliers(data);
    } catch (error: any) {
      toast.error('Failed to load suppliers: ' + error.message);
    }
  };
  
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      supplierType: supplier.supplierType || '',
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      cellNumber: supplier.cellNumber || '',
      email: supplier.email || '',
      city: supplier.city || '',
      paymentTerms: supplier.paymentTerms || '',
      openingBalance: supplier.openingBalance?.toString() || '',
      address: supplier.address || '',
    });
    setErrors({});
  };
  
  const handleDelete = (supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setIsDeleteOpen(true);
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.supplierType) newErrors.supplierType = 'Supplier Type is required';
    if (!formData.name) newErrors.name = 'Supplier Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    const submitData = {
      ...formData,
      openingBalance: formData.openingBalance ? Number(formData.openingBalance) : undefined,
    };
    
    try {
      if (editingSupplier) {
        await supplierApi.update(editingSupplier._id, submitData);
        toast.success('Supplier updated successfully');
      } else {
        await supplierApi.create(submitData);
        toast.success('Supplier created successfully');
      }
      setFormData(initialFormState);
      setEditingSupplier(null);
      setErrors({});
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingSupplier(null);
    setErrors({});
  };
  
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return;
    try {
      await supplierApi.delete(deletingSupplier._id);
      toast.success('Supplier deleted successfully');
      setIsDeleteOpen(false);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  };
  
  const columns: ColumnDef<Supplier>[] = [
    { accessorKey: 'code', header: t('common.code') },
    { accessorKey: 'name', header: t('common.name') },
    { accessorKey: 'supplierType', header: t('masterData.supplierType') },
    { accessorKey: 'contactPerson', header: t('masterData.contactPerson') },
    { accessorKey: 'cellNumber', header: t('masterData.cellNumber') },
    { accessorKey: 'currentBalance', header: t('common.balance'), cell: ({ row }) => formatCurrency(row.original.currentBalance) },
    { accessorKey: 'paymentTerms', header: t('masterData.paymentTerms') },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'active' ? 'default' : 'secondary'}
          className={cn(row.original.status === 'active' && 'bg-green-500', row.original.status === 'blacklisted' && 'bg-red-500')}
        >
          {row.original.status}
        </Badge>
      ),
    },
  ];
  
  const filteredSuppliers = suppliers.filter(
    (s) =>
      (s.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex gap-6">
      {/* Form on Left Side - 1/4 width */}
      <Card className="w-1/4 min-w-[280px]">
        <CardHeader>
          <CardTitle className="text-lg">
            {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplierType">
                Supplier Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.supplierType}
                onValueChange={(value) => handleChange('supplierType', value)}
              >
                <SelectTrigger className={cn(errors.supplierType && 'border-destructive')}>
                  <SelectValue placeholder="Select Supplier Type" />
                </SelectTrigger>
                <SelectContent>
                  {supplierTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplierType && <p className="text-sm text-destructive">{errors.supplierType}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Company or person name"
                className={cn(errors.name && 'border-destructive')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                placeholder="Contact person name"
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@example.com"
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
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) => handleChange('paymentTerms', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Payment Terms" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTerms.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                value={formData.openingBalance}
                onChange={(e) => handleChange('openingBalance', e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Address"
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
          <CardTitle>{t('masterData.suppliers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredSuppliers}
            searchKey="name"
            searchPlaceholder="Search suppliers..."
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
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone."
        itemName={deletingSupplier?.name}
      />
    </div>
  );
}
