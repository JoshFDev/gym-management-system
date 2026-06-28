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

export const getAuditLogs = async (entity?: string) => {
    const filter: Record<string, unknown> = {};
    if (entity) filter.entity = entity;

    const logs = await AuditLog.find(filter)
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(200);
    return logs;
};