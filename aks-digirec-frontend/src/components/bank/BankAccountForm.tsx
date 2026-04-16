import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { bankApi, type BankAccount } from '@/api/services/bankService';
import { toast } from 'sonner';

const accountSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  accountTitle: z.string().min(1, 'Account title is required'),
  accountType: z.enum(['current', 'savings', 'fixed_deposit', 'overdraft', 'loan']),
  branchName: z.string().min(1).or(z.literal('')),
  branchCode: z.string().min(1).or(z.literal('')),
  iban: z.string().min(1).or(z.literal('')),
  swiftCode: z.string().min(1).or(z.literal('')),
  currency: z.string().default('PKR'),
  openingBalance: z.number().min(0).default(0),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface BankAccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  account?: BankAccount | null;
  onSuccess: () => void;
}

export function BankAccountForm({ isOpen, onClose, account, onSuccess }: BankAccountFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: '',
      bankName: '',
      accountNumber: '',
      accountTitle: '',
      accountType: 'current' as const,
      branchName: '',
      branchCode: '',
      iban: '',
      swiftCode: '',
      currency: 'PKR',
      openingBalance: 0
    }
  });

  const accountType = watch('accountType');

  // Reset form when account changes
  useEffect(() => {
    if (account) {
      reset({
        code: account.code,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountTitle: account.accountTitle,
        accountType: account.accountType,
        branchName: account.branchName || '',
        branchCode: account.branchCode || '',
        iban: account.iban || '',
        swiftCode: account.swiftCode || '',
        currency: account.currency,
        openingBalance: account.openingBalance?.amount || 0
      });
    } else {
      reset({
        code: '',
        bankName: '',
        accountNumber: '',
        accountTitle: '',
        accountType: 'current',
        branchName: '',
        branchCode: '',
        iban: '',
        swiftCode: '',
        currency: 'PKR',
        openingBalance: 0
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const onSubmit = async (data: AccountFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        openingBalance: {
          amount: data.openingBalance,
          date: new Date().toISOString()
        }
      };

      if (account) {
        await bankApi.updateBankAccount(account._id, payload);
        toast.success('Bank account updated successfully');
      } else {
        await bankApi.createBankAccount(payload);
        toast.success('Bank account created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save bank account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Account Code *</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="e.g., BA001"
              />
              {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type *</Label>
              <Select
                value={accountType}
                onValueChange={(value) => setValue('accountType', value as AccountFormData['accountType'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                  <SelectItem value="overdraft">Overdraft</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                </SelectContent>
              </Select>
              {errors.accountType && <p className="text-sm text-red-500">{errors.accountType.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                {...register('bankName')}
                placeholder="e.g., Habib Bank Limited"
              />
              {errors.bankName && <p className="text-sm text-red-500">{errors.bankName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name</Label>
              <Input
                id="branchName"
                {...register('branchName')}
                placeholder="e.g., Main Branch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                {...register('accountNumber')}
                placeholder="e.g., 1234567890"
              />
              {errors.accountNumber && <p className="text-sm text-red-500">{errors.accountNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountTitle">Account Title *</Label>
              <Input
                id="accountTitle"
                {...register('accountTitle')}
                placeholder="e.g., ABC Company"
              />
              {errors.accountTitle && <p className="text-sm text-red-500">{errors.accountTitle.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchCode">Branch Code</Label>
              <Input
                id="branchCode"
                {...register('branchCode')}
                placeholder="e.g., 001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                {...register('currency')}
                defaultValue="PKR"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                {...register('iban')}
                placeholder="PK00ABCD1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="swiftCode">SWIFT Code</Label>
              <Input
                id="swiftCode"
                {...register('swiftCode')}
                placeholder="e.g., HABBPKKA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                {...register('openingBalance', { valueAsNumber: true })}
                defaultValue={0}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
