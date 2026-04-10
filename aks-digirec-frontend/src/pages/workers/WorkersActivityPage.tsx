import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, Users, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Lock, Loader2,
  Clock, FileSpreadsheet, UserCheck, UserX, Sun, Umbrella
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/stores';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { workersApi, type SectionGroup } from '@/api/services';
import { attendanceApi, type AttendanceRecord, type AttendanceSummary } from '@/api/services';
import { toast } from 'sonner';
import gsap from 'gsap';

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'half_day' | 'holiday';

interface WorkerActivity {
  id: string;
  workerName: string;
  attendance: 'present' | 'absent';
  balanceBF: number;
  workedAmount: number;
  advanceDaily: number;
  amountToPay: number;
  paid: number;
  balanceCF: number;
  status?: string;
}

export function WorkersActivityPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [sections, setSections] = useState<SectionGroup[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [activities, setActivities] = useState<WorkerActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Attendance state
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [allGroupsAttendance, setAllGroupsAttendance] = useState<AttendanceRecord[]>([]);
  const [allGroupsSummary, setAllGroupsSummary] = useState<AttendanceSummary | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editingWorker, setEditingWorker] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    checkIn: '',
    checkOut: '',
    notes: '',
  });

  // These variables are used for future payment integration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalWorked = activities.reduce((sum, w) => sum + w.workedAmount, 0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalPaid = activities.reduce((sum, w) => sum + w.paid, 0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalAdvance = activities.reduce((sum, w) => sum + w.advanceDaily, 0);

  useEffect(() => {
    setPageTitle(t('navigation.workersActivity'));
  }, [setPageTitle, t]);

  useEffect(() => {
    gsap.fromTo(
      '.workers-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);

  // Load section groups dynamically from backend
  useEffect(() => {
    const loadSections = async () => {
      setSectionsLoading(true);
      try {
        const data = await workersApi.getSectionGroups();
        setSections(data);
        // Set default to 'all' for All Groups tab, not the first section
        if (!activeSection) {
          setActiveSection('all');
        }
      } catch (error: any) {
        toast.error('Failed to load section groups: ' + (error.response?.data?.message || error.message));
      } finally {
        setSectionsLoading(false);
      }
    };
    loadSections();
  }, []);

  // Load worker activities whenever date or section changes
  const loadActivities = useCallback(async () => {
    if (!activeSection) return;
    setActivitiesLoading(true);
    try {
      const data = await workersApi.getActivities({
        date: selectedDate.toISOString().slice(0, 10),
        sectionGroup: activeSection,
      });

      const mappedActivities: WorkerActivity[] = data.map((item: any, index: number) => ({
        id: item._id ?? String(index),
        workerName: item.workerName ?? 'Worker',
        attendance: item.attendance ?? 'absent',
        balanceBF: item.balanceBF ?? 0,
        workedAmount: item.workedAmount ?? 0,
        advanceDaily: item.advanceDaily ?? 0,
        amountToPay: item.amountToPay ?? 0,
        paid: item.paid ?? 0,
        balanceCF: item.balanceCF ?? 0,
        status: item.status,
      }));

      setActivities(mappedActivities);

      // If all workers have approved status, day is closed
      const allClosed =
        mappedActivities.length > 0 &&
        mappedActivities.every((a) => a.status === 'approved');
      setIsDayClosed(allClosed);
    } catch (error: any) {
      toast.error('Failed to load worker activities: ' + (error.response?.data?.message || error.message));
      setActivities([]);
      setIsDayClosed(false);
    } finally {
      setActivitiesLoading(false);
    }
  }, [selectedDate, activeSection]);

  // Load attendance data for all groups
  const loadAllGroupsAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const { data } = await attendanceApi.getAttendance(dateStr);
      const allData: AttendanceRecord[] = data;

      // Calculate summary
      const totalSummary: AttendanceSummary = {
        totalWorkers: allData.length,
        present: allData.filter(w => w.status === 'present').length,
        absent: allData.filter(w => w.status === 'absent').length,
        leave: allData.filter(w => w.status === 'leave').length,
        halfDay: allData.filter(w => w.status === 'half_day').length,
        holiday: allData.filter(w => w.status === 'holiday').length,
        totalWorkingHours: allData.reduce((sum, w) => sum + (w.workingHours || 0), 0),
        totalOvertimeHours: allData.reduce((sum, w) => sum + (w.overtimeHours || 0), 0),
      };

      setAllGroupsAttendance(allData);
      setAllGroupsSummary(totalSummary);
    } catch (error: any) {
      toast.error('Failed to load all groups attendance: ' + (error.response?.data?.message || error.message));
      setAllGroupsAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedDate]);

  // Load attendance data
  const loadAttendance = useCallback(async () => {
    if (!activeSection) return;
    setAttendanceLoading(true);
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      if (activeSection === 'all') {
        await loadAllGroupsAttendance();
      } else {
        const { data, summary } = await attendanceApi.getAttendance(dateStr, activeSection);
        setAttendanceData(data);
        setAttendanceSummary(summary);
      }
    } catch (error: any) {
      toast.error('Failed to load attendance: ' + (error.response?.data?.message || error.message));
      setAttendanceData([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedDate, activeSection, loadAllGroupsAttendance]);

  useEffect(() => {
    loadActivities();
    loadAttendance();
  }, [loadActivities, loadAttendance]);

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    setIsDayClosed(false);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    setIsDayClosed(false);
  };

  // Mark attendance for a worker
  const handleMarkAttendance = async (worker: AttendanceRecord, status: AttendanceStatus) => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      // Use worker's sectionGroup if available, otherwise fall back to activeSection
      const sectionGroup = worker.sectionGroup || activeSection;

      await attendanceApi.markAttendance({
        workerId: worker.workerId,
        date: dateStr,
        status,
        sectionGroup: sectionGroup === 'all' ? undefined : sectionGroup,
      });

      toast.success(`Attendance marked as ${status}`);
      await loadAttendance();
    } catch (error: any) {
      toast.error('Failed to mark attendance: ' + (error.response?.data?.message || error.message));
    } finally {
      // Prevent dropdown selection from snapping viewport to top after re-render/focus restore.
      requestAnimationFrame(() => {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'auto' });
      });
    }
  };

  // Handle Check In
  const handleCheckIn = async (worker: AttendanceRecord) => {
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const checkInTime = new Date(selectedDate);
      checkInTime.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);

      if (worker._id) {
        await attendanceApi.updateAttendance(worker._id, {
          checkIn: checkInTime.toISOString(),
        });
      } else {
        // Use worker's sectionGroup if available, otherwise fall back to activeSection
        const sectionGroup = worker.sectionGroup || activeSection;
        await attendanceApi.markAttendance({
          workerId: worker.workerId,
          date: dateStr,
          status: worker.status || 'present',
          checkIn: checkInTime.toISOString(),
          sectionGroup: sectionGroup === 'all' ? undefined : sectionGroup,
        });
      }

      toast.success('Checked in successfully');
      loadAttendance();
    } catch (error: any) {
      toast.error('Failed to check in: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle Check Out
  const handleCheckOut = async (worker: AttendanceRecord) => {
    try {
      if (!worker.checkIn) {
        toast.error('Cannot check out before check in');
        return;
      }

      const dateStr = selectedDate.toISOString().slice(0, 10);
      const checkOutTime = new Date(selectedDate);
      checkOutTime.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);

      if (worker._id) {
        await attendanceApi.updateAttendance(worker._id, {
          checkOut: checkOutTime.toISOString(),
        });
      } else {
        // Use worker's sectionGroup if available, otherwise fall back to activeSection
        const sectionGroup = worker.sectionGroup || activeSection;
        await attendanceApi.markAttendance({
          workerId: worker.workerId,
          date: dateStr,
          status: worker.status || 'present',
          checkOut: checkOutTime.toISOString(),
          sectionGroup: sectionGroup === 'all' ? undefined : sectionGroup,
        });
      }

      toast.success('Checked out successfully');
      loadAttendance();
    } catch (error: any) {
      toast.error('Failed to check out: ' + (error.response?.data?.message || error.message));
    }
  };

  // Mark all present
  const handleMarkAllPresent = async () => {
    if (!confirm('Mark all workers as present?')) return;
    
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const workersToMark = activeSection === 'all' ? allGroupsAttendance : attendanceData;
      const attendances = workersToMark.map(worker => ({
        workerId: worker.workerId,
        date: dateStr,
        status: 'present' as AttendanceStatus,
        checkIn: new Date(new Date(selectedDate).setHours(9, 0, 0, 0)).toISOString(),
        checkOut: new Date(new Date(selectedDate).setHours(17, 0, 0, 0)).toISOString(),
        sectionGroup: worker.sectionGroup || (activeSection === 'all' ? undefined : activeSection),
      }));

      await attendanceApi.markBulkAttendance({
        date: dateStr,
        sectionGroup: activeSection === 'all' ? undefined : activeSection,
        attendances,
      });

      toast.success('All workers marked as present');
      loadAttendance();
    } catch (error: any) {
      toast.error('Failed to mark attendance: ' + (error.response?.data?.message || error.message));
    }
  };

  // Export attendance to Excel
  const handleExportAttendance = async () => {
    try {
      setIsExporting(true);
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const blob = await attendanceApi.exportAttendance(dateStr, activeSection);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Attendance exported successfully');
    } catch (error: any) {
      toast.error('Failed to export attendance: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsExporting(false);
    }
  };

  // Get attendance icon and color
  const getAttendanceBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return { icon: UserCheck, color: 'bg-green-500', label: 'Present' };
      case 'absent':
        return { icon: UserX, color: 'bg-red-500', label: 'Absent' };
      case 'leave':
        return { icon: Umbrella, color: 'bg-orange-500', label: 'Leave' };
      case 'half_day':
        return { icon: Clock, color: 'bg-yellow-500', label: 'Half Day' };
      case 'holiday':
        return { icon: Sun, color: 'bg-blue-500', label: 'Holiday' };
      default:
        return { icon: XCircle, color: 'bg-gray-500', label: 'Not Marked' };
    }
  };

  const handleCloseDay = async () => {
    if (!confirm('Are you sure you want to close this day? This action cannot be undone.')) {
      return;
    }
    try {
      await workersApi.closeDay(selectedDate.toISOString().slice(0, 10));
      setIsDayClosed(true);
      toast.success('Day closed successfully.');
      loadActivities();
    } catch (error: any) {
      toast.error('Failed to close day: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setActivities([]);
  };

  // Open edit dialog
  const openEditDialog = (worker: AttendanceRecord) => {
    setEditingWorker(worker);
    setEditFormData({
      checkIn: worker.checkIn ? new Date(worker.checkIn).toISOString().slice(11, 16) : '09:00',
      checkOut: worker.checkOut ? new Date(worker.checkOut).toISOString().slice(11, 16) : '17:00',
      notes: worker.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  // Save edited attendance
  const handleSaveEdit = async () => {
    if (!editingWorker) return;
    
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const checkInDate = new Date(`${dateStr}T${editFormData.checkIn}:00`);
      const checkOutDate = new Date(`${dateStr}T${editFormData.checkOut}:00`);
      if (checkOutDate <= checkInDate) {
        toast.error('Check out time must be after check in time');
        return;
      }

      if (editingWorker._id) {
        await attendanceApi.updateAttendance(editingWorker._id, {
          status: editingWorker.status,
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
          notes: editFormData.notes,
        });
      } else {
        await attendanceApi.markAttendance({
          workerId: editingWorker.workerId,
          date: dateStr,
          status: editingWorker.status,
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
          notes: editFormData.notes,
          sectionGroup: editingWorker.sectionGroup || (activeSection === 'all' ? undefined : activeSection),
        });
      }

      toast.success('Attendance updated successfully');
      setIsEditDialogOpen(false);
      loadAttendance();
    } catch (error: any) {
      toast.error('Failed to update attendance: ' + (error.response?.data?.message || error.message));
    }
  };


  return (
    <div className="workers-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.workersActivity')}</h1>
          <p className="text-muted-foreground">
            Record daily worker attendance and payments
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatDate(selectedDate)}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Mark All Present Button */}
          <Button
            onClick={handleMarkAllPresent}
            disabled={isDayClosed || attendanceLoading}
            variant="outline"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Mark All Present
          </Button>

          {/* Export Button */}
          <Button
            onClick={handleExportAttendance}
            disabled={isExporting || (activeSection === 'all' ? allGroupsAttendance.length === 0 : attendanceData.length === 0)}
            variant="outline"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Export Excel
          </Button>

          {/* Close Day Button */}
          <Button
            onClick={handleCloseDay}
            disabled={isDayClosed}
            variant={isDayClosed ? 'secondary' : 'default'}
          >
            {isDayClosed ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Day Closed
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('workers.closeDay')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workers</p>
                <p className="text-2xl font-bold">
                  {activeSection === 'all' 
                    ? allGroupsSummary?.totalWorkers || 0 
                    : attendanceSummary?.totalWorkers || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeSection === 'all' 
                    ? allGroupsSummary?.present || 0 
                    : attendanceSummary?.present || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">
                  {activeSection === 'all' 
                    ? allGroupsSummary?.absent || 0 
                    : attendanceSummary?.absent || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold text-orange-600">
                  {activeSection === 'all' 
                    ? allGroupsSummary?.leave || 0 
                    : attendanceSummary?.leave || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Umbrella className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Section Tabs */}
      {sectionsLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading sections...</span>
        </div>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No section groups found</p>
            <p className="text-sm mt-1">Add sections with a "Section Group" in Master Data → Sections first.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeSection} onValueChange={handleSectionChange}>
          <TabsList
            className="flex flex-wrap gap-1 h-auto"
            style={{ gridTemplateColumns: `repeat(${Math.min(sections.length + 1, 6)}, minmax(0, 1fr))` }}
          >
            <TabsTrigger value="all" className="flex-shrink-0">
              All Groups
            </TabsTrigger>
            {sections.map((section) => (
              <TabsTrigger key={section.id} value={section.id} className="flex-shrink-0">
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.id} value={section.id} className="m-0 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {section.label} - Workers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activitiesLoading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground text-sm">Loading workers...</span>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No workers found in this section group.</p>
                      <p className="text-xs mt-1">Assign workers to the <strong>{section.label}</strong> section in Master Data → Sections.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Worker</th>
                            <th className="text-center p-3 font-medium">Attendance</th>
                            <th className="text-center p-3 font-medium">Check In/Out</th>
                            <th className="text-right p-3 font-medium">Hours</th>
                            <th className="text-right p-3 font-medium">Balance B/F</th>
                            <th className="text-right p-3 font-medium">Worked Amount</th>
                            <th className="text-right p-3 font-medium">Advance</th>
                            <th className="text-right p-3 font-medium">Amount to Pay</th>
                            <th className="text-right p-3 font-medium">Paid</th>
                            <th className="text-right p-3 font-medium">Balance C/F</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceLoading ? (
                            <tr>
                              <td colSpan={10} className="p-4 text-center">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                              </td>
                            </tr>
                          ) : (
                            attendanceData.map((worker) => {
                              const badge = getAttendanceBadge(worker.status);
                              const Icon = badge.icon;
                              return (
                                <tr
                                  key={worker.workerId}
                                  className={cn(
                                    'border-b hover:bg-muted/50 transition-colors',
                                    worker.status === 'absent' && 'opacity-50'
                                  )}
                                >
                                  <td className="p-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                        {worker.workerName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium">{worker.workerName}</p>
                                        <p className="text-xs text-muted-foreground">{worker.workerCode}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <Select
                                      value={worker.status || 'absent'}
                                      onValueChange={(value) => {
                                        handleMarkAttendance(worker, value as AttendanceStatus);
                                      }}
                                      disabled={worker.isApproved}
                                    >
                                      <SelectTrigger className="w-[140px] mx-auto">
                                        <SelectValue>
                                          <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            <span className="capitalize">{badge.label}</span>
                                          </div>
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="present">
                                          <div className="flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 text-green-500" />
                                            <span>Present</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="absent">
                                          <div className="flex items-center gap-2">
                                            <UserX className="h-4 w-4 text-red-500" />
                                            <span>Absent</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="leave">
                                          <div className="flex items-center gap-2">
                                            <Umbrella className="h-4 w-4 text-orange-500" />
                                            <span>Leave</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="half_day">
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-yellow-500" />
                                            <span>Half Day</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="holiday">
                                          <div className="flex items-center gap-2">
                                            <Sun className="h-4 w-4 text-blue-500" />
                                            <span>Holiday</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="p-3 text-center">
                                    {!worker.checkIn ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 border-green-600 hover:bg-green-50"
                                        onClick={() => handleCheckIn(worker)}
                                        disabled={isDayClosed || worker.isApproved}
                                      >
                                        Check In
                                      </Button>
                                    ) : !worker.checkOut ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                        onClick={() => handleCheckOut(worker)}
                                        disabled={isDayClosed || worker.isApproved}
                                      >
                                        Check Out
                                      </Button>
                                    ) : (
                                      <div 
                                        className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                                        onClick={() => !isDayClosed && openEditDialog(worker)}
                                      >
                                        <div>{new Date(worker.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div>{new Date(worker.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                                        {!isDayClosed && <div className="text-xs text-blue-500 mt-1">Click to edit</div>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {worker.workingHours > 0 && (
                                      <div className="text-sm">
                                        <div>{worker.workingHours.toFixed(1)}h</div>
                                        {worker.overtimeHours > 0 && (
                                          <div className="text-xs text-orange-500">+{worker.overtimeHours.toFixed(1)}h OT</div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">{formatCurrency(worker.balanceBF || 0)}</td>
                                  <td className="p-3 text-right">{formatCurrency(0)}</td>
                                  <td className="p-3 text-right">{formatCurrency(0)}</td>
                                  <td className="p-3 text-right font-semibold">{formatCurrency(0)}</td>
                                  <td className="p-3 text-right">{formatCurrency(0)}</td>
                                  <td className="p-3 text-right">{formatCurrency(worker.balanceBF || 0)}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    ))}

    {/* All Groups Tab Content */}
    <TabsContent value="all" className="m-0 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Groups - Workers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground text-sm">Loading all workers...</span>
            </div>
          ) : allGroupsAttendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No workers found in any section group.</p>
              <p className="text-xs mt-1">Add workers to section groups in Master Data → Sections.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Worker</th>
                    <th className="text-center p-3 font-medium">Group</th>
                    <th className="text-center p-3 font-medium">Attendance</th>
                    <th className="text-center p-3 font-medium">Check In/Out</th>
                    <th className="text-right p-3 font-medium">Hours</th>
                    <th className="text-right p-3 font-medium">Balance B/F</th>
                    <th className="text-right p-3 font-medium">Worked Amount</th>
                    <th className="text-right p-3 font-medium">Advance</th>
                    <th className="text-right p-3 font-medium">Amount to Pay</th>
                    <th className="text-right p-3 font-medium">Paid</th>
                    <th className="text-right p-3 font-medium">Balance C/F</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={11} className="p-4 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : (
                    allGroupsAttendance.map((worker) => {
                      const badge = getAttendanceBadge(worker.status);
                      const Icon = badge.icon;
                      return (
                        <tr
                          key={worker.workerId}
                          className={cn(
                            'border-b hover:bg-muted/50 transition-colors',
                            worker.status === 'absent' && 'opacity-50'
                          )}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {worker.workerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{worker.workerName}</p>
                                <p className="text-xs text-muted-foreground">{worker.workerCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              {sections.find(s => s.id === worker.sectionGroup)?.label || worker.sectionGroup || '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Select
                              value={worker.status || 'absent'}
                              onValueChange={(value) => {
                                handleMarkAttendance(worker, value as AttendanceStatus);
                              }}
                              disabled={worker.isApproved}
                            >
                              <SelectTrigger className="w-[140px] mx-auto">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span className="capitalize">{badge.label}</span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="h-4 w-4 text-green-500" />
                                    <span>Present</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="absent">
                                  <div className="flex items-center gap-2">
                                    <UserX className="h-4 w-4 text-red-500" />
                                    <span>Absent</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="leave">
                                  <div className="flex items-center gap-2">
                                    <Umbrella className="h-4 w-4 text-orange-500" />
                                    <span>Leave</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="half_day">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <span>Half Day</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="holiday">
                                  <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4 text-blue-500" />
                                    <span>Holiday</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-center">
                            {!worker.checkIn ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleCheckIn(worker)}
                                disabled={isDayClosed || worker.isApproved}
                              >
                                Check In
                              </Button>
                            ) : !worker.checkOut ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                onClick={() => handleCheckOut(worker)}
                                disabled={isDayClosed || worker.isApproved}
                              >
                                Check Out
                              </Button>
                            ) : (
                              <div 
                                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                                onClick={() => !isDayClosed && openEditDialog(worker)}
                              >
                                <div>{new Date(worker.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div>{new Date(worker.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                                {!isDayClosed && <div className="text-xs text-blue-500 mt-1">Click to edit</div>}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {worker.workingHours > 0 && (
                              <div className="text-sm">
                                <div>{worker.workingHours.toFixed(1)}h</div>
                                {worker.overtimeHours > 0 && (
                                  <div className="text-xs text-orange-500">+{worker.overtimeHours.toFixed(1)}h OT</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">{formatCurrency(worker.balanceBF || 0)}</td>
                          <td className="p-3 text-right">{formatCurrency(0)}</td>
                          <td className="p-3 text-right">{formatCurrency(0)}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(0)}</td>
                          <td className="p-3 text-right">{formatCurrency(0)}</td>
                          <td className="p-3 text-right">{formatCurrency(worker.balanceBF || 0)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
)}
{/* Edit Attendance Dialog */}
<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Attendance - {editingWorker?.workerName}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="checkIn">Check In Time</Label>
        <Input
          id="checkIn"
          type="time"
          value={editFormData.checkIn}
          onChange={(e) => setEditFormData({ ...editFormData, checkIn: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="checkOut">Check Out Time</Label>
        <Input
          id="checkOut"
          type="time"
          value={editFormData.checkOut}
          onChange={(e) => setEditFormData({ ...editFormData, checkOut: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          placeholder="Add notes about attendance"
          value={editFormData.notes}
          onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSaveEdit}>
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}
