import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, Building2, Shield, Settings, Plus, Pencil,
  Trash2, CheckCircle, Loader2, RefreshCw, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import gsap from 'gsap';
import { companyApi } from '@/api/services';
import { userApi, type SystemUser, type Role } from '@/api/services/userService';
import type { Company } from '@/types';

export function AdminPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('companies');

  // Data states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    activeTrials: 0,
    systemStatus: 'Online'
  });

  // Modal states
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'company' | 'user'; id: string } | null>(null);

  // Search states
  const [companySearch, setCompanySearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

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

  // Load data with separate loading states
  const loadData = useCallback(async () => {
    setLoadError(null);
    let companiesData: Company[] = [];
    let usersData: SystemUser[] = [];
    let rolesData: Role[] = [];
    let hasError = false;

    // Load companies
    setIsLoadingCompanies(true);
    try {
      companiesData = await companyApi.getCompanies();
      setCompanies(companiesData);
    } catch (error: any) {
      hasError = true;
      console.error('Failed to load companies:', error);
      if (error.response?.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to view companies.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoadingCompanies(false);
    }

    // Load users
    setIsLoadingUsers(true);
    try {
      const response = await userApi.getUsers();
      usersData = response.data;
      setUsers(usersData);
    } catch (error: any) {
      hasError = true;
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }

    // Load roles
    setIsLoadingRoles(true);
    try {
      rolesData = await userApi.getRoles();
      setRoles(rolesData);
    } catch (error: any) {
      hasError = true;
      console.error('Failed to load roles:', error);
    } finally {
      setIsLoadingRoles(false);
    }

    // Update stats with whatever data we have
    setStats({
      totalCompanies: companiesData.length,
      totalUsers: usersData.length,
      activeTrials: companiesData.filter((c: Company) => c.status === 'trial').length,
      systemStatus: hasError ? 'Degraded' : 'Online'
    });

    if (hasError) {
      setLoadError('Some data could not be loaded. Please check your permissions or try again.');
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Company CRUD operations
  const handleCreateCompany = async (data: Partial<Company>) => {
    try {
      await companyApi.createCompany(data);
      toast({ title: 'Success', description: 'Company created successfully' });
      setCompanyModalOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create company',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateCompany = async (id: string, data: Partial<Company>) => {
    try {
      await companyApi.updateCompany(id, data);
      toast({ title: 'Success', description: 'Company updated successfully' });
      setCompanyModalOpen(false);
      setEditingCompany(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update company',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await companyApi.deleteCompany(id);
      toast({ title: 'Success', description: 'Company deleted successfully' });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete company',
        variant: 'destructive'
      });
    }
  };

  // User CRUD operations
  const handleCreateUser = async (data: any) => {
    try {
      await userApi.createUser(data);
      toast({ title: 'Success', description: 'User created successfully' });
      setUserModalOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create user',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateUser = async (id: string, data: any) => {
    try {
      await userApi.updateUser(id, data);
      toast({ title: 'Success', description: 'User updated successfully' });
      setUserModalOpen(false);
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await userApi.deleteUser(id);
      toast({ title: 'Success', description: 'User deleted successfully' });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete user',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Trial</Badge>;
      case 'suspended':
      case 'expired':
        return <Badge className="bg-red-500 hover:bg-red-600">Suspended</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadge = (roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    const displayName = role?.displayName?.en || roleName;

    switch (roleName) {
      case 'super_admin':
        return <Badge className="bg-purple-500 hover:bg-purple-600">{displayName}</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500 hover:bg-blue-600">{displayName}</Badge>;
      case 'manager':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">{displayName}</Badge>;
      case 'accountant':
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">{displayName}</Badge>;
      case 'operator':
        return <Badge variant="outline">{displayName}</Badge>;
      case 'viewer':
        return <Badge variant="secondary">{displayName}</Badge>;
      default:
        return <Badge variant="secondary">{displayName || roleName}</Badge>;
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.code?.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoadingCompanies || isLoadingUsers}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCompanies || isLoadingUsers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold">{stats.totalCompanies}</p>
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
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
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
                <p className="text-2xl font-bold">{stats.activeTrials}</p>
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
                <p className="text-2xl font-bold text-green-600">{stats.systemStatus}</p>
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
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search companies..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button size="sm" onClick={() => { setEditingCompany(null); setCompanyModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCompanies ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No companies found
                </div>
              ) : (
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
                      {filteredCompanies.map((company: Company) => (
                        <tr key={company._id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{company.name}</td>
                          <td className="p-3 font-mono text-sm">{company.code}</td>
                          <td className="p-3 text-center">-</td>
                          <td className="p-3">{company.trialEndDate ? formatDate(company.trialEndDate) : 'N/A'}</td>
                          <td className="p-3 text-center">{getStatusBadge(company.status)}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingCompany(company); setCompanyModalOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setItemToDelete({ type: 'company', id: company._id }); setDeleteConfirmOpen(true); }}
                              >
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

        <TabsContent value="users" className="m-0 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">System Users</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button size="sm" onClick={() => { setEditingUser(null); setUserModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers || isLoadingRoles ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
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
                      {filteredUsers.map((user: SystemUser) => (
                        <tr key={user._id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{user.firstName} {user.lastName}</td>
                          <td className="p-3 text-sm">{user.email}</td>
                          <td className="p-3">{getRoleBadge(user.role?.name)}</td>
                          <td className="p-3">{user.company?.name || '-'}</td>
                          <td className="p-3 text-center">{getStatusBadge(user.isActive ? 'active' : 'inactive')}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingUser(user); setUserModalOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setItemToDelete({ type: 'user', id: user._id }); setDeleteConfirmOpen(true); }}
                              >
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

        <TabsContent value="settings" className="m-0 mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>

      {/* Company Modal */}
      <CompanyModal
        isOpen={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        company={editingCompany}
        onSubmit={editingCompany ?
          (data) => handleUpdateCompany(editingCompany._id, data) :
          handleCreateCompany
        }
      />

      {/* User Modal */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={editingUser}
        roles={roles}
        onSubmit={editingUser ?
          (data) => handleUpdateUser(editingUser._id, data) :
          handleCreateUser
        }
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this {itemToDelete?.type}? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (itemToDelete?.type === 'company') {
                  handleDeleteCompany(itemToDelete.id);
                } else if (itemToDelete?.type === 'user') {
                  handleDeleteUser(itemToDelete.id);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Company Modal Component
function CompanyModal({
  isOpen,
  onClose,
  company,
  onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'active',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Pakistan'
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        code: company.code || '',
        status: company.status || 'active',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        country: company.country || 'Pakistan'
      });
    } else {
      setFormData({
        name: '',
        code: '',
        status: 'active',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Pakistan'
      });
    }
  }, [company, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Add Company'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {company ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// User Modal Component
function UserModal({
  isOpen,
  onClose,
  user,
  roles,
  onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  user: SystemUser | null;
  roles: Role[];
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    phone: '',
    department: '',
    isActive: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        roleId: user.role?._id || '',
        phone: user.phone || '',
        department: user.department || '',
        isActive: user.isActive ?? true
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roleId: roles[0]?._id || '',
        phone: '',
        department: '',
        isActive: true
      });
    }
  }, [user, isOpen, roles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let submitData: any;
    if (user) {
      submitData = { firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone, roleId: formData.roleId, department: formData.department, isActive: formData.isActive };
    } else {
      submitData = { ...formData };
    }
    onSubmit(submitData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!user}
            />
          </div>
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">Password {user ? '(leave blank to keep unchanged)' : '*'}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!user}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.roleId}
              onValueChange={(value) => setFormData({ ...formData, roleId: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role._id} value={role._id}>
                    {role.displayName?.en || role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {user ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Settings Tab Component
function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoBackup: true,
    debugMode: false,
    maintenanceMode: false
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: 'Setting Updated',
      description: `${key} has been ${!settings[key] ? 'enabled' : 'disabled'}.`
    });
  };

  return (
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
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Auto Backup</p>
              <p className="text-sm text-muted-foreground">
                Automatically backup data daily
              </p>
            </div>
            <Switch
              checked={settings.autoBackup}
              onCheckedChange={() => handleToggle('autoBackup')}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Debug Mode</p>
              <p className="text-sm text-muted-foreground">
                Enable debug logging for troubleshooting
              </p>
            </div>
            <Switch
              checked={settings.debugMode}
              onCheckedChange={() => handleToggle('debugMode')}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Put system in maintenance mode (only admins can access)
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={() => handleToggle('maintenanceMode')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
