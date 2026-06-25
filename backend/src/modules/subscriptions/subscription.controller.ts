import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import {
    createSubscription,
    getSubscriptions,
    renewSubscription,
} from "./subscription.service";
import { toSubscriptionResponse } from "./subscription.dto";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const subscription = await createSubscription(req.body);

        await logAudit({
            action: "CREATE",
            entity: "Subscription",
            entityId: subscription._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        notifyAll({
            type: "subscription_created",
            title: "Suscripción creada",
            message: `Nueva suscripción creada por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({
            success: true,
            message: "Subscription created successfully.",
            data: subscription,
        });
    }
);

export const getAll = asyncHandler(
    async (req: Request, res: Response) => {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const result = await getSubscriptions(page, limit);
        res.status(200).json({
            success: true,
            data: result.items.map(toSubscriptionResponse),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
);

export const renew = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const subscription = await renewSubscription(req.params.id as string);

        await logAudit({
            action: "UPDATE",
            entity: "Subscription",
            entityId: subscription._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        notifyAll({
            type: "subscription_renewed",
            title: "Suscripción renovada",
            message: `Suscripción renovada por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Subscription renewed successfully.",
            data: {
                id: subscription._id.toString(),
                memberId: subscription.memberId.toString(),
                planId: subscription.planId.toString(),
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                status: subscription.status,
                createdAt: subscription.createdAt,
                updatedAt: subscription.updatedAt,
            },
        });
    }
);