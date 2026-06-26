import { z } from "zod";

import {
    PaymentMethod,
    PaymentStatus,
} from "./payment.types";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId.");

export const createPaymentSchema = z.object({
    memberId: objectId,

    subscriptionId: objectId,

    amount: z
        .number()
        .min(0, "Amount cannot be negative."),

    method: z
        .enum(PaymentMethod),

    notes: z
        .string()
        .optional(),
});

export const updatePaymentSchema = z.object({
    status: z
        .enum(PaymentStatus)
        .optional(),

    notes: z
        .string()
        .optional(),
});

export type CreatePaymentInput =
    z.infer<typeof createPaymentSchema>;

export type UpdatePaymentInput =
    z.infer<typeof updatePaymentSchema>;