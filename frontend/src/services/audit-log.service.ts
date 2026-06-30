import api from "../api/axios";

interface AuditLogFilters {
    entity?: string;
    role?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const getAuditLogs = async (filters?: AuditLogFilters) => {
    const params: Record<string, string> = {};
    if (filters?.entity) params.entity = filters.entity;
    if (filters?.role) params.role = filters.role;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    const response = await api.get("/audit-logs", { params });
    return response.data;
};
