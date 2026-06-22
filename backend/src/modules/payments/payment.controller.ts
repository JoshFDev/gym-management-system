import { Request, Response } from "express";

import { createPayment, getPayments, updatePayment, } from "./payment.service";

import { toPaymentResponse, } from "./payment.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";

export const create = asyncHandler(
    async (req: Request, res: Response) => {

        const payment = await createPayment(
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Payment registered successfully.",
            data: {
                id: payment._id.toString(),
                memberId: payment.memberId.toString(),
                subscriptionId: payment.subscriptionId.toString(),
                amount: payment.amount,
                method: payment.method,
                status: payment.status,
                paidAt: payment.paidAt,
                notes: payment.notes,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
            }
        });

    }
);

export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {

        const payments =
            await getPayments();

        res.status(200).json({
            success: true,
            data: payments.map(toPaymentResponse),
        });

    }
);

export const update = asyncHandler(
    async (req: Request, res: Response) => {

        const payment =
            await updatePayment(
                req.params.id as string,
                req.body
            );

        res.status(200).json({
            success: true,
            message: "Payment updated successfully.",
            data: toPaymentResponse(payment),
        });

    }
);