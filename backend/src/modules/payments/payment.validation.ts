import { z } from "zod";

import {
    PaymentMethod,
    PaymentStatus,
} from "./payment.types";

export const createPaymentSchema = z.object({
    memberId: z
        .string()
        .min(1, "Member ID is required."),

    subscriptionId: z
        .string()
        .min(1, "Subscription ID is required."),

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