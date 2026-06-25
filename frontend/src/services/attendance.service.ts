import api from "../api/axios";

interface AttendanceFilters {
    gender?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export const getAttendances = async (page: number = 1, limit: number = 20, filters?: AttendanceFilters) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.gender) params.set("gender", filters.gender);
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    if (filters?.search) params.set("search", filters.search);
    const response = await api.get(`/attendance?${params.toString()}`);
    return response.data;
};

export const createAttendance = async (memberId: string) => {
    const response = await api.post("/attendance", { memberId });
    return response.data;
};

export const getAttendanceReport = async (dateFrom: string, dateTo: string) => {
    const response = await api.get(`/attendance/report?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`);
    return response.data;
};