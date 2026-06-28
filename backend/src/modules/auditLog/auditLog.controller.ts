import { Request, Response } from "express";
import { getAuditLogs } from "./auditLog.service";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";

export const getAll = asyncHandler(
    async (req: Request, res: Response) => {
        const entity = req.query.entity as string | undefined;
        const logs = await getAuditLogs(entity);

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
