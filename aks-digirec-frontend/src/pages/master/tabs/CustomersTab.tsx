import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/custom/DataTable';
import { DeleteDialog } from '@/components/custom/DeleteDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { Customer } from '@/types';
import { customerApi } from '@/api/services';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const customerTypes = [
  { value: 'Retail', label: 'Retail' },
  { value: 'Wholesale', label: 'Wholesale' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Export', label: 'Export' },
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
  customerType: '',
  name: '',
  contactPerson: '',
  cellNumber: '',
  email: '',
  city: '',
  creditLimit: '',
  paymentTerms: '',
  openingBalance: '',
  address: '',
};

interface CustomersTabProps {
  searchQuery: string;
}

export function CustomersTab({ searchQuery }: CustomersTabProps) {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchCustomers = async () => {
    try {
      const data = await customerApi.getAll();
      setCustomers(data);
    } catch (error: any) {
      toast.error('Failed to load customers: ' + error.message);
    }
  };
  
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerType: customer.customerType || '',
      name: customer.name || '',
      contactPerson: customer.contactPerson || '',
      cellNumber: customer.cellNumber || '',
      email: customer.email || '',
      city: customer.city || '',
      creditLimit: customer.creditLimit?.toString() || '',
      paymentTerms: customer.paymentTerms || '',
      openingBalance: customer.openingBalance?.toString() || '',
      address: customer.address || '',
    });
    setErrors({});
  };
  
  const handleDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteOpen(true);
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerType) newErrors.customerType = 'Customer Type is required';
    if (!formData.name) newErrors.name = 'Customer Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    const submitData = {
      ...formData,
      creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
      openingBalance: formData.openingBalance ? Number(formData.openingBalance) : undefined,
    };
    
    try {
      if (editingCustomer) {
        await customerApi.update(editingCustomer._id, submitData);
        toast.success('Customer updated successfully');
      } else {
        await customerApi.create(submitData);
        toast.success('Customer created successfully');
      }
      setFormData(initialFormState);
      setEditingCustomer(null);
      setErrors({});
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingCustomer(null);
    setErrors({});
  };
  
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;
    try {
      await customerApi.delete(deletingCustomer._id);
      toast.success('Customer deleted successfully');
      setIsDeleteOpen(false);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };
  
  const columns: ColumnDef<Customer>[] = [
    { accessorKey: 'code', header: t('common.code') },
    { accessorKey: 'name', header: t('common.name') },
    { accessorKey: 'customerType', header: t('masterData.customerType') },
    { accessorKey: 'contactPerson', header: t('masterData.contactPerson') },
    { accessorKey: 'cellNumber', header: t('masterData.cellNumber') },
    { accessorKey: 'currentBalance', header: t('common.balance'), cell: ({ row }) => formatCurrency(row.original.currentBalance) },
    { accessorKey: 'creditLimit', header: t('masterData.creditLimit'), cell: ({ row }) => formatCurrency(row.original.creditLimit) },
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
  
  const filteredCustomers = customers.filter(
    (c) =>
      (c.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex gap-6">
      {/* Form on Left Side - 1/4 width */}
      <Card className="w-1/4 min-w-[280px]">
        <CardHeader>
          <CardTitle className="text-lg">
            {editingCustomer ? 'Edit Customer' : 'Add Customer'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerType">
                Customer Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.customerType}
                onValueChange={(value) => handleChange('customerType', value)}
              >
                <SelectTrigger className={cn(errors.customerType && 'border-destructive')}>
                  <SelectValue placeholder="Select Customer Type" />
                </SelectTrigger>
                <SelectContent>
                  {customerTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerType && <p className="text-sm text-destructive">{errors.customerType}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">
                Customer Name <span className="text-destructive">*</span>
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
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', e.target.value)}
                placeholder="0"
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
          <CardTitle>{t('masterData.customers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredCustomers}
            searchKey="name"
            searchPlaceholder="Search customers..."
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
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        itemName={deletingCustomer?.name}
      />
    </div>
  );
}
