import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido.");

export const createSubscriptionSchema = z.object({
    memberId: objectId,

    planId: objectId,

    startDate: z
        .string()
        .optional(),
});

export type CreateSubscriptionInput =
    z.infer<typeof createSubscriptionSchema>;