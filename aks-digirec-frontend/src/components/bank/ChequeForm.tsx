import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { bankApi, type BankAccount } from '@/api/services';
import { toast } from 'sonner';
import { format } from 'date-fns';

const chequeSchema = z.object({
  bankAccount: z.string().min(1, 'Bank account is required'),
  type: z.enum(['received', 'issued']),
  amount: z.number().positive('Amount must be positive'),
  chequeNumber: z.string().min(1, 'Cheque number is required'),
  chequeDate: z.string().min(1, 'Cheque date is required'),
  chequeBank: z.string().optional(),
  partyName: z.string().min(1, 'Party name is required'),
  description: z.string().optional(),
});

type ChequeFormData = z.infer<typeof chequeSchema>;

interface ChequeFormProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  onSuccess: () => void;
}

export function ChequeForm({ isOpen, onClose, accounts, onSuccess }: ChequeFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ChequeFormData>({
    resolver: zodResolver(chequeSchema),
    defaultValues: {
      type: 'received',
      chequeDate: format(new Date(), 'yyyy-MM-dd'),
      amount: 0
    }
  });

  const chequeType = watch('type');

  const onSubmit = async (data: ChequeFormData) => {
    setIsLoading(true);
    try {
      await bankApi.createCheque({
        bankAccount: data.bankAccount,
        type: data.type === 'received' ? 'cheque_deposit' : 'cheque_clearance',
        amount: data.amount,
        party: { name: data.partyName },
        description: data.description,
        chequeNumber: data.chequeNumber,
        chequeDate: data.chequeDate,
        chequeBank: data.chequeBank,
        status: 'pending'
      } as any);
      toast.success('Cheque added successfully');
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add cheque');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Cheque</DialogTitle>
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
              <Label htmlFor="type">Cheque Type *</Label>
              <Select
                value={chequeType}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received (Deposit)</SelectItem>
                  <SelectItem value="issued">Issued (Payment)</SelectItem>
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
            <Label htmlFor="chequeNumber">Cheque Number *</Label>
            <Input
              id="chequeNumber"
              {...register('chequeNumber')}
              placeholder="e.g., 000123"
            />
            {errors.chequeNumber && <p className="text-sm text-red-500">{errors.chequeNumber.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chequeDate">Cheque Date *</Label>
              <Input
                id="chequeDate"
                type="date"
                {...register('chequeDate')}
              />
              {errors.chequeDate && <p className="text-sm text-red-500">{errors.chequeDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chequeBank">Cheque Bank</Label>
              <Input
                id="chequeBank"
                {...register('chequeBank')}
                placeholder="Bank name on cheque"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partyName">{chequeType === 'received' ? 'Received From' : 'Paid To'} *</Label>
            <Input
              id="partyName"
              {...register('partyName')}
              placeholder={chequeType === 'received' ? 'Payer name' : 'Payee name'}
            />
            {errors.partyName && <p className="text-sm text-red-500">{errors.partyName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Additional details"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Cheque'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
