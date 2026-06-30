import { Request, Response } from "express";
import { getAuditLogs } from "./auditLog.service";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";

export const getAll = asyncHandler(
    async (req: Request, res: Response) => {
        const logs = await getAuditLogs({
            entity: req.query.entity as string | undefined,
            role: req.query.role as string | undefined,
            dateFrom: req.query.dateFrom as string | undefined,
            dateTo: req.query.dateTo as string | undefined,
        });

        const data = logs.map((log) => ({
            id: log._id.toString(),
            action: log.action,
            entity: log.entity,
            entityId: log.entityId.toString(),
            user: log.userId
                ? {
                      id: (log.userId as any)._id?.toString(),
                      name: `${(log.userId as any).firstName} ${(log.userId as any).lastName}`,
                      email: (log.userId as any).email,
                  }
                : null,
            userRole: log.userRole,
            changes: log.changes,
            createdAt: log.createdAt,
        }));

        res.status(200).json({
            success: true,
            data,
        });
    }
);
