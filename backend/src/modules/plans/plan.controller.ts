import { Request, Response } from "express";

import {
    createPlan,
    getPlans,
    getPlanById,
    updatePlan,
    deactivatePlan,
} from "./plan.service";

import { toPlanResponse } from "./plan.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";

export const create = asyncHandler(
    async (req: Request, res: Response) => {

        const plan = await createPlan(
            req.body
        );

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
            data: plans.map(
                toPlanResponse
            ),
        });

    }
);

export const getById = asyncHandler(
    async (req: Request, res: Response) => {

        const plan = await getPlanById(
            req.params.id as string
        );

        res.status(200).json({
            success: true,
            data: toPlanResponse(plan),
        });

    }
);

export const update = asyncHandler(
    async (req: Request, res: Response) => {

        const plan = await updatePlan(
            req.params.id as string,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Plan updated successfully.",
            data: toPlanResponse(plan),
        });

    }
);

export const deactivate = asyncHandler(
    async (req: Request, res: Response) => {

        const plan = await deactivatePlan(
            req.params.id as string
        );

        res.status(200).json({
            success: true,
            message: "Plan deactivated successfully.",
            data: toPlanResponse(plan),
        });

    }
);