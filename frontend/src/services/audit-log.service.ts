import api from "../api/axios";

export const getAuditLogs = async (entity?: string) => {
    const params = entity ? { entity } : undefined;
    const response = await api.get("/audit-logs", { params });
    return response.data;
};
