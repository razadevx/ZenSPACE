import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface AttendanceRecord {
  _id: string | null;
  workerId: string;
  workerName: string;
  workerCode: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'half_day' | 'holiday';
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  notes: string;
  leaveType: string | null;
  isApproved: boolean;
  sectionGroup: string | null;
  hasAttendance: boolean;
  balanceBF?: number;
  workedAmount?: number;
  advanceDaily?: number;
  amountToPay?: number;
  paid?: number;
  balanceCF?: number;
}

export interface AttendanceSummary {
  totalWorkers: number;
  present: number;
  absent: number;
  leave: number;
  halfDay: number;
  holiday: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
}

export interface MarkAttendancePayload {
  workerId: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'half_day' | 'holiday';
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  sectionGroup?: string;
  leaveType?: string;
}

export interface BulkAttendancePayload {
  date: string;
  sectionGroup?: string;
  attendances: MarkAttendancePayload[];
}

export const attendanceApi = {
  // Get attendance for a specific date and section
  getAttendance: async (date: string, sectionGroup?: string): Promise<{ data: AttendanceRecord[]; summary: AttendanceSummary }> => {
    const response = await apiClient.get<ApiResponse<AttendanceRecord[]>>('/attendance', {
      params: { date, sectionGroup },
    });
    const data = (response.data as any).data ?? [];
    const summary = (response.data as any).summary ?? {
      totalWorkers: 0,
      present: 0,
      absent: 0,
      leave: 0,
      halfDay: 0,
      holiday: 0,
      totalWorkingHours: 0,
      totalOvertimeHours: 0,
    };
    return { data, summary };
  },

  // Mark attendance for a single worker
  markAttendance: async (payload: MarkAttendancePayload): Promise<AttendanceRecord> => {
    const response = await apiClient.post<ApiResponse<AttendanceRecord>>('/attendance', payload);
    return (response.data as any).data;
  },

  // Mark bulk attendance
  markBulkAttendance: async (payload: BulkAttendancePayload): Promise<{ status: string; attendance: AttendanceRecord }[]> => {
    const response = await apiClient.post<ApiResponse<{ status: string; attendance: AttendanceRecord }[]>>('/attendance/bulk', payload);
    return (response.data as any).data ?? [];
  },

  // Update attendance
  updateAttendance: async (id: string, payload: Partial<MarkAttendancePayload>): Promise<AttendanceRecord> => {
    const response = await apiClient.put<ApiResponse<AttendanceRecord>>(`/attendance/${id}`, payload);
    return (response.data as any).data;
  },

  // Approve attendance
  approveAttendance: async (id: string): Promise<void> => {
    await apiClient.put(`/attendance/${id}/approve`);
  },

  // Delete attendance
  deleteAttendance: async (id: string): Promise<void> => {
    await apiClient.delete(`/attendance/${id}`);
  },

  // Export attendance to Excel
  exportAttendance: async (date: string, sectionGroup?: string): Promise<Blob> => {
    const response = await apiClient.get('/attendance/export', {
      params: { date, sectionGroup },
      responseType: 'blob',
    });
    return response.data;
  },

  // Get attendance report for date range
  getAttendanceReport: async (startDate: string, endDate: string, workerId?: string, sectionGroup?: string) => {
    const response = await apiClient.get('/attendance/report', {
      params: { startDate, endDate, workerId, sectionGroup },
    });
    return (response.data as any)?.data ?? [];
  },

  // Get monthly summary
  getMonthlySummary: async (month: number, year: number) => {
    const response = await apiClient.get('/attendance/monthly-summary', {
      params: { month, year },
    });
    return (response.data as any)?.data ?? [];
  },
};
