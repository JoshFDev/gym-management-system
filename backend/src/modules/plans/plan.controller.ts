import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import {
    createPlan,
    getPlans,
    getPlanById,
    updatePlan,
    deactivatePlan,
} from "./plan.service";
import { toPlanResponse } from "./plan.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const plan = await createPlan(req.body);

        await logAudit({
            action: "CREATE",
            entity: "Plan",
            entityId: plan._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        notifyAll({
            type: "plan_created",
            title: "Plan creado",
            message: `${plan.name} fue creado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({
            success: true,
            message: "Plan created successfully.",
            data: toPlanResponse(plan),
        });
    }
);

export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {
        const plans = await getPlans();
        res.status(200).json({
            success: true,
            data: plans.map(toPlanResponse),
        });
    }
);

export const getById = asyncHandler(
    async (req: Request, res: Response) => {
        const plan = await getPlanById(req.params.id as string);
        res.status(200).json({
            success: true,
            data: toPlanResponse(plan),
        });
    }
);

export const update = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const plan = await updatePlan(req.params.id as string, req.body);

        await logAudit({
            action: "UPDATE",
            entity: "Plan",
            entityId: plan._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: req.body,
        });

        notifyAll({
            type: "plan_updated",
            title: "Plan actualizado",
            message: `${plan.name} fue modificado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Plan updated successfully.",
            data: toPlanResponse(plan),
        });
    }
);

export const deactivate = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const plan = await deactivatePlan(req.params.id as string);

        await logAudit({
            action: "DELETE",
            entity: "Plan",
            entityId: plan._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: { status: "inactive" },
        });

        notifyAll({
            type: "plan_deactivated",
            title: "Plan desactivado",
            message: `${plan.name} fue desactivado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Plan deactivated successfully.",
            data: toPlanResponse(plan),
        });
    }
);