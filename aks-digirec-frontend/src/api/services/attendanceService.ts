import apiClient from '../interceptors/axiosConfig';
import type { ApiResponse } from '@/types';

export interface WageCalculation {
  hourlyRate: number;
  overtimeRate: number;
  dailyRate: number;
  regularHours: number;
  overtimeHours: number;
  regularWages: number;
  overtimeWages: number;
  totalWages: number;
}

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
  // Payment fields
  balanceBF: number;
  workedAmount: number;
  advanceAmount: number;
  amountToPay: number;
  paidAmount: number;
  balanceCF: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  wageCalculation: WageCalculation;
  workerWageType: string;
  workerWageAmount: number;
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
  // Payment summaries
  totalWorkedAmount: number;
  totalAdvanceAmount: number;
  totalPaidAmount: number;
  totalAmountToPay: number;
  totalBalanceCF: number;
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
      totalWorkedAmount: 0,
      totalAdvanceAmount: 0,
      totalPaidAmount: 0,
      totalAmountToPay: 0,
      totalBalanceCF: 0,
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

  // Record payment/advance for attendance
  recordPayment: async (id: string, payload: { advanceAmount?: number; paidAmount?: number }): Promise<AttendanceRecord> => {
    const response = await apiClient.put<ApiResponse<AttendanceRecord>>(`/attendance/${id}/payment`, payload);
    return (response.data as any).data;
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
