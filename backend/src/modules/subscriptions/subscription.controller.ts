import { Request, Response } from "express";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";

import { createSubscription, getSubscriptions, renewSubscription} from "./subscription.service";

import { toSubscriptionResponse, } from "./subscription.dto";

export const create = asyncHandler(
    async (req: Request, res: Response) => {

        const subscription = await createSubscription(
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Subscription created successfully.",
            data: subscription,
        });

    }
);


export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {
        const subscriptions = await getSubscriptions();

        res.status(200).json({
            success: true,
            data: subscriptions.map(
                toSubscriptionResponse
            ),
        });

    }
);

export const renew = asyncHandler(
    async (req: Request, res: Response) => {

        const subscription =
            await renewSubscription(
                req.params.id as string
            );

        res.status(200).json({
            success: true,
            message:
                "Subscription renewed successfully.",
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

