import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatCurrency } from '@/lib/utils';
import { Check, ChevronsUpDown, Plus, Trash2, Loader2 } from 'lucide-react';
import { cashApi } from '@/api/services/cashService';
import { customerApi } from '@/api/services/masterService';
import { supplierApi } from '@/api/services/masterService';
import { finishedGoodApi } from '@/api/services/masterService';
import type { Customer, Supplier, FinishedGood } from '@/types';

// Transaction Types
const TRANSACTION_TYPES = [
  { value: 'SALE', label: 'Sale', color: 'bg-green-100 text-green-800' },
  { value: 'PURCHASE', label: 'Purchase', color: 'bg-red-100 text-red-800' },
  { value: 'SALES_RETURN', label: 'Sales Return', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PURCHASE_RETURN', label: 'Purchase Return', color: 'bg-blue-100 text-blue-800' },
  { value: 'EXPENSE', label: 'Expense', color: 'bg-orange-100 text-orange-800' },
  { value: 'INCOME', label: 'Income', color: 'bg-purple-100 text-purple-800' },
] as const;

type TransactionType = typeof TRANSACTION_TYPES[number]['value'];

// Payment Modes
const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'ONLINE', label: 'Online Payment' },
  { value: 'CREDIT', label: 'Credit' },
] as const;

// Expense Categories - Must match backend CashTransaction model enum
const EXPENSE_CATEGORIES = [
  { value: 'salary', label: 'Salary' },
  { value: 'wages', label: 'Wages' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'transport', label: 'Transport' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'office_expense', label: 'Office Expense' },
  { value: 'other_expense', label: 'Other Expense' },
] as const;

// Item Row Type
interface ItemRow {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  total: number;
}

// Form Data Type
interface FormData {
  type: TransactionType | '';
  documentNo: string;
  date: string;
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'supplier' | 'walk-in' | '';
  category: string;
  paymentMode: string;
  notes: string;
  items: ItemRow[];
  referenceId: string; // For returns
  amount: number; // Auto-calculated or manual for expenses
}

interface ERPTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
}

export function ERPTransactionForm({
  isOpen,
  onClose,
  onSuccess,
  defaultDate = new Date().toISOString().split('T')[0],
}: ERPTransactionFormProps) {

  // Form State
  const [formData, setFormData] = useState<FormData>({
    type: '',
    documentNo: '',
    date: defaultDate,
    partyId: '',
    partyName: '',
    partyType: '',
    category: '',
    paymentMode: 'CASH',
    notes: '',
    items: [],
    referenceId: '',
    amount: 0,
  });

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDocNo, setIsGeneratingDocNo] = useState(false);

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<FinishedGood[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Popover States
  const [partyOpen, setPartyOpen] = useState(false);
  const [productOpen, setProductOpen] = useState<string | null>(null);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  // Generate document number when type changes
  useEffect(() => {
    if (formData.type && !formData.documentNo) {
      generateDocumentNumber(formData.type);
    }
  }, [formData.type]);

  // Reset form when type changes
  useEffect(() => {
    if (formData.type) {
      setFormData((prev) => ({
        ...prev,
        partyId: '',
        partyName: '',
        partyType: '',
        items: [],
        referenceId: '',
        category: prev.type === 'EXPENSE' ? prev.category : '',
        amount: 0,
      }));
      setErrors({});
    }
  }, [formData.type]);

  // Auto-calculate total amount from items
  useEffect(() => {
    if (formData.items.length > 0) {
      const total = formData.items.reduce((sum, item) => sum + item.total, 0);
      setFormData((prev) => ({ ...prev, amount: total }));
    }
  }, [formData.items]);

  const loadMasterData = async () => {
    setIsLoadingCustomers(true);
    setIsLoadingSuppliers(true);
    setIsLoadingProducts(true);

    try {
      const [customersData, suppliersData, productsData] = await Promise.all([
        customerApi.getAll(),
        supplierApi.getAll(),
        finishedGoodApi.getAll(),
      ]);
      setCustomers(customersData);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load master data:', error);
      toast.error('Failed to load master data');
    } finally {
      setIsLoadingCustomers(false);
      setIsLoadingSuppliers(false);
      setIsLoadingProducts(false);
    }
  };

  const generateDocumentNumber = async (type: TransactionType) => {
    setIsGeneratingDocNo(true);
    try {
      const prefix = {
        SALE: 'SALE',
        PURCHASE: 'PUR',
        SALES_RETURN: 'SRET',
        PURCHASE_RETURN: 'PRET',
        EXPENSE: 'EXP',
        INCOME: 'INC',
      }[type];

      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const docNo = `${prefix}-${timestamp}${random}`;

      setFormData((prev) => ({ ...prev, documentNo: docNo }));
    } finally {
      setIsGeneratingDocNo(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handlePartySelect = (partyId: string, partyName: string, partyType: 'customer' | 'supplier' | 'walk-in') => {
    // For Walk-in, send null partyId and 'other' partyType to match backend schema
    if (partyType === 'walk-in') {
      handleInputChange('partyId', ''); // Will be converted to null in submit
      handleInputChange('partyName', 'Walk-in');
      handleInputChange('partyType', 'other');
    } else {
      handleInputChange('partyId', partyId);
      handleInputChange('partyName', partyName);
      handleInputChange('partyType', partyType);
    }
    setPartyOpen(false);
  };

  const handleAddItem = () => {
    const newItem: ItemRow = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: '',
      itemName: '',
      quantity: 1,
      rate: 0,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleItemChange = (itemId: string, field: keyof ItemRow, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;

        const updated = { ...item, [field]: value };

        // Auto-calculate total when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          updated.total = updated.quantity * updated.rate;
        }

        return updated;
      }),
    }));
  };

  const handleProductSelect = (itemId: string, product: FinishedGood) => {
    handleItemChange(itemId, 'itemId', product._id);
    handleItemChange(itemId, 'itemName', product.name);
    handleItemChange(itemId, 'rate', product.sellingPrice || product.costPrice || 0);
    setProductOpen(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Transaction type is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.documentNo) {
      newErrors.documentNo = 'Document number is required';
    }

    // For SALE and PURCHASE, party and items are required
    if (formData.type === 'SALE' || formData.type === 'PURCHASE') {
      if (!formData.partyId && formData.partyType !== 'walk-in') {
        newErrors.partyId = `${formData.type === 'SALE' ? 'Customer' : 'Supplier'} is required`;
      }

      if (formData.items.length === 0) {
        newErrors.items = 'At least one item is required';
      } else {
        formData.items.forEach((item, index) => {
          if (!item.itemId) {
            newErrors[`item_${index}_product`] = 'Product is required';
          }
          if (item.quantity <= 0) {
            newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
          }
          if (item.rate < 0) {
            newErrors[`item_${index}_rate`] = 'Rate cannot be negative';
          }
        });
      }
    }

    // For EXPENSE and INCOME, amount must be > 0
    if (formData.type === 'EXPENSE' || formData.type === 'INCOME') {
      if (formData.type === 'EXPENSE' && !formData.category) {
        newErrors.category = 'Category is required for expenses';
      }
      if (formData.amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      }
    }

    // For RETURNS, reference is required
    if (formData.type === 'SALES_RETURN' || formData.type === 'PURCHASE_RETURN') {
      if (!formData.referenceId) {
        newErrors.referenceId = 'Reference document is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      // Map transaction type to correct category for backend (must match CashTransaction model enum)
      const typeToCategory: Record<string, string> = {
        'SALE': 'sale',
        'PURCHASE': 'purchase',
        'SALES_RETURN': 'sale_return',
        'PURCHASE_RETURN': 'purchase_return',
        'EXPENSE': formData.category || 'other_expense',
        'INCOME': 'other_income',
      };

      const payload: any = {
        type: formData.type,
        category: typeToCategory[formData.type] || 'other_expense',
        documentNo: formData.documentNo,
        transactionDate: formData.date,
        partyId: formData.partyId || null,
        partyType: formData.partyType || 'other',
        partyName: formData.partyName || 'Walk-in',
        paymentMode: formData.paymentMode,
        description: formData.notes,
        amount: formData.amount,
      };

      // Add items for SALE/PURCHASE
      if (formData.type === 'SALE' || formData.type === 'PURCHASE') {
        payload.items = formData.items.map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total,
        }));
      }

      // Add reference for RETURNS
      if (formData.type === 'SALES_RETURN' || formData.type === 'PURCHASE_RETURN') {
        payload.referenceId = formData.referenceId;
      }

      console.log('[DEBUG] Submitting transaction:', payload);

      await cashApi.createUnifiedTransaction(payload);

      toast.success('Transaction created successfully');
      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      toast.error('Failed to create transaction: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      type: '',
      documentNo: '',
      date: defaultDate,
      partyId: '',
      partyName: '',
      partyType: '',
      category: '',
      paymentMode: 'CASH',
      notes: '',
      items: [],
      referenceId: '',
      amount: 0,
    });
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Get available parties based on transaction type
  const getAvailableParties = () => {
    switch (formData.type) {
      case 'SALE':
      case 'SALES_RETURN':
        return { type: 'customer', data: customers, label: 'Customer' };
      case 'PURCHASE':
      case 'PURCHASE_RETURN':
        return { type: 'supplier', data: suppliers, label: 'Supplier' };
      case 'EXPENSE':
      case 'INCOME':
        return { type: 'any', data: [], label: 'Party' };
      default:
        return { type: 'none', data: [], label: 'Party' };
    }
  };

  const partyInfo = getAvailableParties();

  // Render Party Selector
  const renderPartySelector = () => {
    if (formData.type === 'EXPENSE' || formData.type === 'INCOME') {
      // For expenses and income, allow free text input or simple dropdown
      return (
        <div className="space-y-2">
          <Label htmlFor="partyName">Party / Payee (Optional)</Label>
          <Input
            id="partyName"
            value={formData.partyName}
            onChange={(e) => handleInputChange('partyName', e.target.value)}
            placeholder="Enter party name or leave blank"
          />
        </div>
      );
    }

    if (partyInfo.type === 'none') {
      return null;
    }

    return (
      <div className="space-y-2">
        <Label htmlFor="party">
          {partyInfo.label} *
        </Label>
        <Popover open={partyOpen} onOpenChange={setPartyOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={partyOpen}
              className={cn(
                'w-full justify-between',
                errors.partyId && 'border-red-500'
              )}
              disabled={isLoadingCustomers || isLoadingSuppliers}
            >
              {formData.partyId ? (
                <span>{formData.partyName}</span>
              ) : (
                <span className="text-muted-foreground">
                  Select {partyInfo.label.toLowerCase()}...
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder={`Search ${partyInfo.label.toLowerCase()}...`} />
              <CommandList>
                <CommandEmpty>No {partyInfo.label.toLowerCase()} found.</CommandEmpty>
                <CommandGroup>
                  {/* Walk-in option */}
                  <CommandItem
                    onSelect={() => handlePartySelect('walk-in', 'Walk-in', 'walk-in')}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        formData.partyType === 'walk-in' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="font-medium">Walk-in</span>
                    <span className="ml-2 text-xs text-muted-foreground">(No specific party)</span>
                  </CommandItem>
                  {partyInfo.data.map((party: any) => (
                    <CommandItem
                      key={party._id}
                      onSelect={() =>
                        handlePartySelect(
                          party._id,
                          party.name,
                          partyInfo.type as 'customer' | 'supplier'
                        )
                      }
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          formData.partyId === party._id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {party.name}
                        </span>
                        {party.contact?.phone && (
                          <span className="text-xs text-muted-foreground">
                            {party.contact.phone}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.partyId && (
          <p className="text-sm text-red-500">{errors.partyId}</p>
        )}
      </div>
    );
  };

  // Render Items Table for SALE/PURCHASE
  const renderItemsTable = () => {
    if (formData.type !== 'SALE' && formData.type !== 'PURCHASE') {
      return null;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items *</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>

        {errors.items && <p className="text-sm text-red-500">{errors.items}</p>}

        {formData.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Product</TableHead>
                <TableHead className="w-[15%]">Qty</TableHead>
                <TableHead className="w-[20%]">Rate</TableHead>
                <TableHead className="w-[20%]">Total</TableHead>
                <TableHead className="w-[5%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Popover
                      open={productOpen === item.id}
                      onOpenChange={(open) => setProductOpen(open ? item.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between text-xs',
                            errors[`item_${index}_product`] && 'border-red-500'
                          )}
                          disabled={isLoadingProducts}
                        >
                          {item.itemName || 'Select product...'}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="h-[200px]">
                                {products.map((product) => (
                                  <CommandItem
                                    key={product._id}
                                    onSelect={() => handleProductSelect(item.id, product)}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        item.itemId === product._id
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {product.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Rate: {formatCurrency(product.sellingPrice || product.costPrice || 0)}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {errors[`item_${index}_product`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors[`item_${index}_product`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)
                      }
                      className={cn(
                        'h-8 text-xs',
                        errors[`item_${index}_quantity`] && 'border-red-500'
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) =>
                        handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)
                      }
                      className={cn(
                        'h-8 text-xs',
                        errors[`item_${index}_rate`] && 'border-red-500'
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-xs">
                    {formatCurrency(item.total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {formData.items.length > 0 && (
          <div className="flex justify-end">
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Total Amount:</span>
              <p className="text-xl font-bold">{formatCurrency(formData.amount)}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Expense/Income Fields
  const renderExpenseIncomeFields = () => {
    if (formData.type !== 'EXPENSE' && formData.type !== 'INCOME') {
      return null;
    }

    const isExpense = formData.type === 'EXPENSE';

    return (
      <>
        {isExpense && (
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger className={cn(errors.category && 'border-red-500')}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (PKR) *</Label>
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.amount || ''}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
            className={cn(errors.amount && 'border-red-500')}
            placeholder="0.00"
          />
          {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
        </div>
      </>
    );
  };

  // Render Return Fields
  const renderReturnFields = () => {
    if (formData.type !== 'SALES_RETURN' && formData.type !== 'PURCHASE_RETURN') {
      return null;
    }

    return (
      <div className="space-y-2">
        <Label htmlFor="referenceId">
          Reference {formData.type === 'SALES_RETURN' ? 'Sale' : 'Purchase'} *
        </Label>
        <Select
          value={formData.referenceId}
          onValueChange={(value) => handleInputChange('referenceId', value)}
        >
          <SelectTrigger className={cn(errors.referenceId && 'border-red-500')}>
            <SelectValue placeholder={`Select ${formData.type === 'SALES_RETURN' ? 'sale' : 'purchase'} document`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ref1">Reference documents will be loaded here</SelectItem>
          </SelectContent>
        </Select>
        {errors.referenceId && <p className="text-sm text-red-500">{errors.referenceId}</p>}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New ERP Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: TransactionType) => handleInputChange('type', value)}
            >
              <SelectTrigger className={cn(errors.type && 'border-red-500')}>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', type.color)}>{type.label}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
          </div>

          {/* Document Number and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentNo">Document No *</Label>
              <div className="flex gap-2">
                <Input
                  id="documentNo"
                  value={formData.documentNo}
                  onChange={(e) => handleInputChange('documentNo', e.target.value)}
                  className={cn(errors.documentNo && 'border-red-500')}
                  placeholder="Auto-generated"
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => formData.type && generateDocumentNumber(formData.type)}
                  disabled={!formData.type || isGeneratingDocNo}
                >
                  {isGeneratingDocNo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs">↻</span>
                  )}
                </Button>
              </div>
              {errors.documentNo && <p className="text-sm text-red-500">{errors.documentNo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={cn(errors.date && 'border-red-500')}
                required
              />
              {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
            </div>
          </div>

          {/* Party Selector */}
          {renderPartySelector()}

          {/* Dynamic Fields Based on Type */}
          {renderItemsTable()}
          {renderExpenseIncomeFields()}
          {renderReturnFields()}

          {/* Payment Mode */}
          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select
              value={formData.paymentMode}
              onValueChange={(value) => handleInputChange('paymentMode', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter any additional notes..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Summary for Items-based transactions */}
          {(formData.type === 'SALE' || formData.type === 'PURCHASE') && formData.amount > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-2xl font-bold">{formatCurrency(formData.amount)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Transaction'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
