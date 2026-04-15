import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Landmark, ArrowUpRight, ArrowDownRight, Plus,
  CheckCircle, XCircle, Clock, Pencil, Trash2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import { bankApi, type BankAccount, type BankTransaction, type Cheque } from '@/api/services';
import { BankAccountForm, BankTransactionForm, ChequeForm } from '@/components/bank';
import { toast } from 'sonner';
import gsap from 'gsap';

export function BankPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [summary, setSummary] = useState({ totalBalance: 0, accountCount: 0, pendingCheques: 0, clearedCheques: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  // Form modals state
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isChequeFormOpen, setIsChequeFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  useEffect(() => {
    setPageTitle(t('navigation.cashBank'));
  }, [setPageTitle, t]);

  useEffect(() => {
    gsap.fromTo(
      '.bank-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accountsData, summaryData, transactionsData, chequesData] = await Promise.all([
        bankApi.getBankAccounts(),
        bankApi.getBankSummary(),
        bankApi.getBankTransactions(),
        bankApi.getCheques()
      ]);
      setAccounts(accountsData);
      setSummary(summaryData);
      setTransactions(transactionsData.data);
      setCheques(chequesData.data);
    } catch (error: any) {
      toast.error('Failed to load bank data: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await bankApi.deleteBankAccount(id);
      toast.success('Account deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await bankApi.deleteBankTransaction(id);
      toast.success('Transaction deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete transaction');
    }
  };

  const handleUpdateChequeStatus = async (id: string, status: 'cleared' | 'bounced' | 'cancelled') => {
    try {
      await bankApi.updateChequeStatus(id, status);
      toast.success(`Cheque marked as ${status}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update cheque status');
    }
  };

  const getChequeStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'bounced': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    const isCredit = ['deposit', 'transfer_in', 'cheque_deposit', 'interest'].includes(type);
    return isCredit ? 
      <ArrowDownRight className="h-3 w-3 text-green-500" /> : 
      <ArrowUpRight className="h-3 w-3 text-red-500" />;
  };

  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bank-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.cashBank')}</h1>
          <p className="text-muted-foreground">Manage bank accounts and cheque transactions</p>
        </div>
        {activeTab === 'accounts' && (
          <Button onClick={() => { setSelectedAccount(null); setIsAccountFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        )}
        {activeTab === 'transactions' && (
          <Button onClick={() => { setSelectedTransaction(null); setIsTransactionFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        )}
        {activeTab === 'cheques' && (
          <Button onClick={() => setIsChequeFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cheque
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80">Total Bank Balance</p>
                <p className="text-4xl font-bold">{formatCurrency(summary.totalBalance)}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-xl">
                <Landmark className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Total Accounts</p>
            <p className="text-3xl font-bold">{summary.accountCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">Pending Cheques</p>
            <p className="text-3xl font-bold text-yellow-600">{summary.pendingCheques}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="m-0 mt-4">
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bank accounts found. Add your first account to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account) => (
                <Card key={account._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg capitalize">{account.accountType} Account</p>
                        <p className="text-sm text-muted-foreground">{account.bankName}</p>
                        <p className="text-sm text-muted-foreground font-mono mt-1">{account.accountNumber}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedAccount(account); setIsAccountFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAccount(account._id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(account.currentBalance?.amount || 0)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-left p-3 font-medium">Account</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx._id} className="border-b hover:bg-muted/50">
                          <td className="p-3">{formatDate(tx.transactionDate)}</td>
                          <td className="p-3">{tx.description}</td>
                          <td className="p-3">
                            {typeof tx.bankAccount === 'object' ? tx.bankAccount.bankName : 'Unknown'}
                          </td>
                          <td className="p-3 text-right">
                            <span className={['deposit', 'transfer_in', 'cheque_deposit', 'interest'].includes(tx.type) ? 'text-green-600' : 'text-red-600'}>
                              {['deposit', 'transfer_in', 'cheque_deposit', 'interest'].includes(tx.type) ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={tx.status === 'cleared' ? 'default' : 'outline'}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedTransaction(tx); setIsTransactionFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(tx._id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cheques Tab */}
        <TabsContent value="cheques" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cheque Management</CardTitle>
            </CardHeader>
            <CardContent>
              {cheques.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No cheques found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Cheque No</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Party</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-center p-3 font-medium">Type</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cheques.map((cheque) => (
                        <tr key={cheque._id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{cheque.cheque?.number}</td>
                          <td className="p-3">{formatDate(cheque.cheque?.date || cheque.createdAt)}</td>
                          <td className="p-3">{cheque.party?.name || 'Unknown'}</td>
                          <td className="p-3 text-right">{formatCurrency(cheque.amount)}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">
                              {cheque.type === 'cheque_deposit' ? 'Received' : 'Issued'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getChequeStatusIcon(cheque.cheque?.status || 'pending')}
                              <span className="capitalize">{cheque.cheque?.status || 'pending'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {cheque.cheque?.status === 'pending' && (
                              <div className="flex justify-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleUpdateChequeStatus(cheque._id, 'cleared')}>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleUpdateChequeStatus(cheque._id, 'bounced')}>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Modals */}
      <BankAccountForm
        isOpen={isAccountFormOpen}
        onClose={() => setIsAccountFormOpen(false)}
        account={selectedAccount}
        onSuccess={fetchData}
      />

      <BankTransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
        accounts={accounts}
        transaction={selectedTransaction}
        onSuccess={fetchData}
      />

      <ChequeForm
        isOpen={isChequeFormOpen}
        onClose={() => setIsChequeFormOpen(false)}
        accounts={accounts}
        onSuccess={fetchData}
      />
    </div>
  );
}
