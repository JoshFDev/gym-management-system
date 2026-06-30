import AuditLog from "./auditLog.model";

interface LogAuditParams {
    action: "CREATE" | "UPDATE" | "DELETE";
    entity: string;
    entityId: string;
    userId: string;
    userRole: string;
    changes?: Record<string, any>;
}

export const logAudit = async (params: LogAuditParams) => {
    await AuditLog.create(params);
};

export const getAuditLogs = async (filters: {
    entity?: string;
    role?: string;
    dateFrom?: string;
    dateTo?: string;
}) => {
    const filter: Record<string, unknown> = {};
    if (filters.entity) filter.entity = filters.entity;
    if (filters.role) filter.userRole = filters.role;
    if (filters.dateFrom || filters.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (filters.dateFrom) dateFilter.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) dateFilter.$lte = new Date(filters.dateTo);
        filter.createdAt = dateFilter;
    }

    const logs = await AuditLog.find(filter)
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(200);
    return logs;
};