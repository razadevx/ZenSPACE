import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Layers, Package, Truck, Users, UserCircle, Box,
  Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUIStore } from '@/stores';
import gsap from 'gsap';

// Import sub-pages
import { SectionsTab } from './tabs/SectionsTab';
import { RawMaterialsTab } from './tabs/RawMaterialsTab';
import { SuppliersTab } from './tabs/SuppliersTab';
import { WorkersTab } from './tabs/WorkersTab';
import { CustomersTab } from './tabs/CustomersTab';
import { FinishedGoodsTab } from './tabs/FinishedGoodsTab';

const tabs = [
  { id: 'sections', label: 'masterData.sections', icon: Layers },
  { id: 'raw-materials', label: 'masterData.rawMaterials', icon: Package },
  { id: 'suppliers', label: 'masterData.suppliers', icon: Truck },
  { id: 'workers', label: 'masterData.workers', icon: Users },
  { id: 'customers', label: 'masterData.customers', icon: UserCircle },
  { id: 'finished-goods', label: 'masterData.finishedGoods', icon: Box },
];

export function MasterDataPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('sections');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    setPageTitle(t('navigation.masterData'));
  }, [setPageTitle, t]);
  
  useEffect(() => {
    // Animate tab content
    gsap.fromTo(
      '.tab-content',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3 }
    );
  }, [activeTab]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.masterData')}</h1>
          <p className="text-muted-foreground">
            Manage all master data for your factory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(tab.label)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        <div className="tab-content">
          <TabsContent value="sections" className="m-0">
            <SectionsTab searchQuery={searchQuery} />
          </TabsContent>
          
          <TabsContent value="raw-materials" className="m-0">
            <RawMaterialsTab searchQuery={searchQuery} />
          </TabsContent>
          
          <TabsContent value="suppliers" className="m-0">
            <SuppliersTab searchQuery={searchQuery} />
          </TabsContent>
          
          <TabsContent value="workers" className="m-0">
            <WorkersTab searchQuery={searchQuery} />
          </TabsContent>
          
          <TabsContent value="customers" className="m-0">
            <CustomersTab searchQuery={searchQuery} />
          </TabsContent>
          
          <TabsContent value="finished-goods" className="m-0">
            <FinishedGoodsTab searchQuery={searchQuery} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
