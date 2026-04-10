import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Building2, Shield, Settings, Plus, Pencil,
  Trash2, CheckCircle, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
// import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import gsap from 'gsap';

interface Company {
  id: string;
  name: string;
  code: string;
  status: string;
  trialEndDate: Date;
  usersCount: number;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  status: string;
  lastLogin: Date;
}

export function AdminPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('companies');
  
  useEffect(() => {
    document.title = t('navigation.userManagement');
  }, [t]);
  
  useEffect(() => {
    gsap.fromTo(
      '.admin-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);
  
  const demoCompanies: Company[] = [
    {
      id: '1',
      name: 'AKS Ceramics',
      code: 'AKS-001',
      status: 'active',
      trialEndDate: new Date('2024-12-31'),
      usersCount: 3,
    },
    {
      id: '2',
      name: 'Premium Pottery',
      code: 'PRE-001',
      status: 'trial',
      trialEndDate: new Date('2024-11-30'),
      usersCount: 2,
    },
  ];
  
  const demoUsers: SystemUser[] = [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@aks.com',
      role: 'ADMIN',
      company: 'AKS Ceramics',
      status: 'active',
      lastLogin: new Date(),
    },
    {
      id: '2',
      name: 'Operator One',
      email: 'operator@aks.com',
      role: 'OPERATOR',
      company: 'AKS Ceramics',
      status: 'active',
      lastLogin: new Date(),
    },
  ];
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-500">Trial</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-purple-500">Super Admin</Badge>;
      case 'ADMIN':
        return <Badge className="bg-blue-500">Admin</Badge>;
      case 'OPERATOR':
        return <Badge variant="outline">Operator</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };
  
  return (
    <div className="admin-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.userManagement')}</h1>
          <p className="text-muted-foreground">
            Manage companies, users, and system settings
          </p>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold">{demoCompanies.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{demoUsers.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Trials</p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-2xl font-bold text-green-600">Online</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="companies" className="m-0 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Companies</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-center p-3 font-medium">Users</th>
                      <th className="text-left p-3 font-medium">Trial Ends</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoCompanies.map((company) => (
                      <tr key={company.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{company.name}</td>
                        <td className="p-3 font-mono text-sm">{company.code}</td>
                        <td className="p-3 text-center">{company.usersCount}</td>
                        <td className="p-3">{formatDate(company.trialEndDate)}</td>
                        <td className="p-3 text-center">{getStatusBadge(company.status)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
        
        <TabsContent value="users" className="m-0 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">System Users</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Company</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{user.name}</td>
                        <td className="p-3 text-sm">{user.email}</td>
                        <td className="p-3">{getRoleBadge(user.role)}</td>
                        <td className="p-3">{user.company}</td>
                        <td className="p-3 text-center">{getStatusBadge(user.status)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Lock className="h-4 w-4" />
                            </Button>
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
        
        <TabsContent value="settings" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup data daily
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Debug Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Enable debug logging
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Put system in maintenance mode
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
