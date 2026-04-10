import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/custom/DataTable';
import { DeleteDialog } from '@/components/custom/DeleteDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { Section } from '@/types';
import { sectionApi } from '@/api/services';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const sectionGroups = [
  { value: 'Clay Group', label: 'Clay Group' },
  { value: 'Glaze & Color Group', label: 'Glaze & Color Group' },
  { value: 'Kiln Group', label: 'Kiln Group' },
  { value: 'Flower Group', label: 'Flower Group' },
  { value: 'Sticker Group', label: 'Sticker Group' },
  { value: 'Packing Group', label: 'Packing Group' },
  { value: 'Other', label: 'Other' },
];

interface SectionsTabProps {
  searchQuery: string;
}

const initialFormState = {
  sectionGroup: '',
  mainSection: '',
  subSection: '',
  isNonMaterial: false,
  description: '',
};

export function SectionsTab({ searchQuery }: SectionsTabProps) {
  const { t } = useTranslation();
  const [sections, setSections] = useState<Section[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch sections
  const fetchSections = async () => {
    try {
      const data = await sectionApi.getAll();
      setSections(data);
    } catch (error: any) {
      toast.error('Failed to load sections: ' + error.message);
    }
  };
  
  useEffect(() => {
    fetchSections();
  }, []);
  
  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setFormData({
      sectionGroup: section.sectionGroup || '',
      mainSection: section.mainSection || '',
      subSection: section.subSection || '',
      isNonMaterial: section.isNonMaterial || false,
      description: section.description || '',
    });
    setErrors({});
  };
  
  const handleDelete = (section: Section) => {
    setDeletingSection(section);
    setIsDeleteOpen(true);
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.sectionGroup) newErrors.sectionGroup = 'Section Group is required';
    if (!formData.mainSection) newErrors.mainSection = 'Main Section is required';
    if (!formData.subSection) newErrors.subSection = 'Sub Section is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      if (editingSection) {
        await sectionApi.update(editingSection._id, formData);
        toast.success('Section updated successfully');
      } else {
        await sectionApi.create(formData);
        toast.success('Section created successfully');
      }
      setFormData(initialFormState);
      setEditingSection(null);
      setErrors({});
      fetchSections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save section');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingSection(null);
    setErrors({});
  };
  
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingSection) return;
    try {
      await sectionApi.delete(deletingSection._id);
      toast.success('Section deleted successfully');
      setIsDeleteOpen(false);
      fetchSections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete section');
    }
  };
  
  const columns: ColumnDef<Section>[] = [
    { accessorKey: 'code', header: t('common.code') },
    { accessorKey: 'sectionGroup', header: t('masterData.sectionGroup') },
    { accessorKey: 'mainSection', header: t('masterData.mainSection') },
    { accessorKey: 'subSection', header: t('masterData.subSection') },
    {
      accessorKey: 'isNonMaterial',
      header: t('masterData.nonMaterial'),
      cell: ({ row }) => (
        <Badge variant={row.original.isNonMaterial ? 'secondary' : 'outline'}>
          {row.original.isNonMaterial ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className={cn(row.original.status === 'active' && 'bg-green-500')}>
          {row.original.status}
        </Badge>
      ),
    },
  ];
  
  const filteredSections = sections.filter(
    (s) =>
      (s.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subSection || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.mainSection || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex gap-6">
      {/* Form on Left Side - 1/4 width */}
      <Card className="w-1/4 min-w-[280px]">
        <CardHeader>
          <CardTitle className="text-lg">
            {editingSection ? 'Edit Section' : 'Add Section'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sectionGroup">
                Section Group <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.sectionGroup}
                onValueChange={(value) => handleChange('sectionGroup', value)}
              >
                <SelectTrigger className={cn(errors.sectionGroup && 'border-destructive')}>
                  <SelectValue placeholder="Select Section Group" />
                </SelectTrigger>
                <SelectContent>
                  {sectionGroups.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sectionGroup && <p className="text-sm text-destructive">{errors.sectionGroup}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mainSection">
                Main Section <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mainSection"
                value={formData.mainSection}
                onChange={(e) => handleChange('mainSection', e.target.value)}
                placeholder="e.g., Clay Forming"
                className={cn(errors.mainSection && 'border-destructive')}
              />
              {errors.mainSection && <p className="text-sm text-destructive">{errors.mainSection}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subSection">
                Sub Section <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subSection"
                value={formData.subSection}
                onChange={(e) => handleChange('subSection', e.target.value)}
                placeholder="e.g., Handle Making"
                className={cn(errors.subSection && 'border-destructive')}
              />
              {errors.subSection && <p className="text-sm text-destructive">{errors.subSection}</p>}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isNonMaterial"
                checked={formData.isNonMaterial}
                onCheckedChange={(checked) => handleChange('isNonMaterial', checked)}
              />
              <Label htmlFor="isNonMaterial" className="text-sm font-normal">
                This section only records labor, no material deduction
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description"
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
          <CardTitle>{t('masterData.sections')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredSections}
            searchKey="subSection"
            searchPlaceholder="Search sections..."
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
        title="Delete Section"
        description="Are you sure you want to delete this section? This action cannot be undone."
        itemName={deletingSection?.subSection}
      />
    </div>
  );
}
