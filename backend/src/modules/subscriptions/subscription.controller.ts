import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import {
    createSubscription,
    getSubscriptions,
    renewSubscription,
    cancelSubscription,
    deleteSubscription,
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
            message: "Suscripción creada exitosamente.",
            data: toSubscriptionResponse(subscription),
        });
    }
);

export const getAll = asyncHandler(
    async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string | undefined;
        const planId = req.query.planId as string | undefined;
        const status = req.query.status as string | undefined;
        const result = await getSubscriptions(page, limit, search, planId, status);
        res.status(200).json({
            success: true,
            data: result.items.map(toSubscriptionResponse),
            total: result.total,
            totalPages: result.totalPages,
            page: result.page,
            limit: result.limit,
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
            message: "Suscripción renovada exitosamente.",
            data: toSubscriptionResponse(subscription),
        });
    }
);

export const cancel = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const subscription = await cancelSubscription(req.params.id as string);

        await logAudit({
            action: "UPDATE",
            entity: "Subscription",
            entityId: subscription._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: { status: "cancelled" },
        });

        notifyAll({
            type: "subscription_cancelled",
            title: "Suscripción cancelada",
            message: `Suscripción cancelada por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Suscripción cancelada exitosamente.",
            data: toSubscriptionResponse(subscription),
        });
    }
);

export const remove = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const subscription = await deleteSubscription(req.params.id as string);

        await logAudit({
            action: "DELETE",
            entity: "Subscription",
            entityId: req.params.id as string,
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        res.status(200).json({
            success: true,
            message: "Suscripción eliminada exitosamente.",
        });
    }
);