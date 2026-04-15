import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { bankApi, type BankAccount, type BankTransaction } from '@/api/services';
import { toast } from 'sonner';
import { format } from 'date-fns';

const transactionSchema = z.object({
  bankAccount: z.string().min(1, 'Bank account is required'),
  type: z.enum(['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'cheque_deposit', 'cheque_clearance', 'bank_charges', 'interest']),
  amount: z.number().positive('Amount must be positive'),
  transactionDate: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface BankTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  transaction?: BankTransaction | null;
  onSuccess: () => void;
}

export function BankTransactionForm({ isOpen, onClose, accounts, transaction, onSuccess }: BankTransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'deposit',
      transactionDate: format(new Date(), 'yyyy-MM-dd'),
      amount: 0
    }
  });

  const transactionType = watch('type');

  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true);
    try {
      if (transaction) {
        await bankApi.updateBankTransaction(transaction._id, data);
        toast.success('Transaction updated successfully');
      } else {
        await bankApi.createBankTransaction(data);
        toast.success('Transaction created successfully');
      }
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankAccount">Bank Account *</Label>
            <Select
              value={watch('bankAccount')}
              onValueChange={(value) => setValue('bankAccount', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc._id} value={acc._id}>
                    {acc.bankName} - {acc.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bankAccount && <p className="text-sm text-red-500">{errors.bankAccount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type *</Label>
              <Select
                value={transactionType}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="transfer_in">Transfer In</SelectItem>
                  <SelectItem value="transfer_out">Transfer Out</SelectItem>
                  <SelectItem value="cheque_deposit">Cheque Deposit</SelectItem>
                  <SelectItem value="cheque_clearance">Cheque Clearance</SelectItem>
                  <SelectItem value="bank_charges">Bank Charges</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionDate">Date *</Label>
            <Input
              id="transactionDate"
              type="date"
              {...register('transactionDate')}
            />
            {errors.transactionDate && <p className="text-sm text-red-500">{errors.transactionDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Transaction description"
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number</Label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder="Optional reference"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Additional notes"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : transaction ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
