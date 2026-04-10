import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Landmark, ArrowUpRight, ArrowDownRight, Plus,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import { bankApi, type BankAccount, type BankTransaction } from '@/api/services';
import { toast } from 'sonner';
import gsap from 'gsap';

export function BankPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [accountsData, transactionsData] = await Promise.all([
          bankApi.getBankAccounts(),
          bankApi.getBankTransactions(),
        ]);
        setAccounts(accountsData);
        setTransactions(transactionsData.data);
      } catch (error: any) {
        toast.error('Failed to load bank data: ' + (error.response?.data?.message || error.message));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const demoAccounts: BankAccount[] = accounts.length > 0 ? accounts : [
    {
      _id: '1',
      bankName: 'Habib Bank Limited',
      accountNumber: '1234567890',
      accountType: 'Current',
      balance: 150000,
      isActive: true,
      companyId: '',
    },
    {
      _id: '2', 
      bankName: 'Muslim Commercial Bank',
      accountNumber: '0987654321',
      accountType: 'Savings',
      balance: 75000,
      isActive: true,
      companyId: '',
    },
  ];
  
  interface Cheque {
    id: string;
    chequeNo: string;
    date: Date;
    amount: number;
    party: string;
    type: 'issued' | 'received';
    status: 'issued' | 'cleared' | 'bounced' | 'cancelled';
  }
  
  const demoCheques: Cheque[] = [
    {
      id: '1',
      chequeNo: '000123',
      date: new Date(),
      amount: 50000,
      party: 'ABC Traders',
      type: 'issued',
      status: 'cleared',
    },
    {
      id: '2',
      chequeNo: '000124',
      date: new Date(),
      amount: 25000,
      party: 'XYZ Suppliers',
      type: 'received',
      status: 'issued',
    },
  ];
  
  const totalBalance = demoAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const getChequeStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'bounced': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };
  
  return (
    <div className="bank-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.cashBank')}</h1>
          <p className="text-muted-foreground">
            Manage bank accounts and cheque transactions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>
      
      {/* Total Balance Card */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80">Total Bank Balance</p>
              <p className="text-4xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="p-4 bg-white/20 rounded-xl">
              <Landmark className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts" className="m-0 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoAccounts.map((account) => (
              <Card key={account._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{account.accountType} Account</p>
                      <p className="text-sm text-muted-foreground">{account.bankName}</p>
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        {account.accountNumber}
                      </p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(account.balance)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Account</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-center p-3 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">{formatDate(new Date())}</td>
                      <td className="p-3">Deposit from Sales</td>
                      <td className="p-3">Main Account</td>
                      <td className="p-3 text-right text-green-600 font-medium">
                        +{formatCurrency(50000)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3 text-green-500" />
                          Credit
                        </Badge>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">{formatDate(new Date())}</td>
                      <td className="p-3">Payment to Supplier</td>
                      <td className="p-3">Business Account</td>
                      <td className="p-3 text-right text-red-600 font-medium">
                        -{formatCurrency(25000)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-red-500" />
                          Debit
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cheques" className="m-0 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Cheque Management</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Cheque
              </Button>
            </CardHeader>
            <CardContent>
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
                    </tr>
                  </thead>
                  <tbody>
                    {demoCheques.map((cheque) => (
                      <tr key={cheque.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{cheque.chequeNo}</td>
                        <td className="p-3">{formatDate(cheque.date)}</td>
                        <td className="p-3">{cheque.party}</td>
                        <td className="p-3 text-right">{formatCurrency(cheque.amount)}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline">{cheque.type}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getChequeStatusIcon(cheque.status)}
                            <span className="capitalize">{cheque.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
