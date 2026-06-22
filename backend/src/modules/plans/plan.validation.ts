import { z } from "zod";
import { PlanStatus } from "./plan.types";

export const createPlanSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Plan name must be at least 2 characters."),

    description: z
        .string()
        .optional(),

    price: z
        .number()
        .min(0, "Price cannot be negative."),

    durationDays: z
        .number()
        .min(1, "Duration must be at least 1 day."),

    status: z
        .enum(PlanStatus)
        .optional(),
});

export const updatePlanSchema =
    createPlanSchema.partial();

export type CreatePlanInput =
    z.infer<typeof createPlanSchema>;

export type UpdatePlanInput =
    z.infer<typeof updatePlanSchema>;