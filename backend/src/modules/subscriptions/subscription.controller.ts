import { Request, Response } from "express";

import { toSubscriptionResponse } from "./subscription.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";

import { createSubscription, getSubscriptions } from "./subscription.service";

export const create = asyncHandler(
    async (req: Request, res: Response) => {

        const subscription = await createSubscription(
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Subscription created successfully.",
            data: toSubscriptionResponse(subscription),
        });

    }
);


export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {
        const subscriptions = await getSubscriptions();

        res.status(200).json({
            success: true,
            data: subscriptions,
        });
    }
);