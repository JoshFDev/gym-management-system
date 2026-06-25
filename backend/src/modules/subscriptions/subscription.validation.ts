import { z } from "zod";

export const createSubscriptionSchema = z.object({
    memberId: z
        .string()
        .min(1, "Member ID is required."),

    planId: z
        .string()
        .min(1, "Plan ID is required."),

    startDate: z
        .string()
        .optional(),
});

export type CreateSubscriptionInput =
    z.infer<typeof createSubscriptionSchema>;