import { z } from "zod";
import { PlanStatus } from "./plan.types";

export const createPlanSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "El nombre del plan debe tener al menos 2 caracteres."),

    description: z
        .string()
        .optional(),

    price: z
        .number()
        .min(0, "El precio no puede ser negativo."),

    durationDays: z
        .number()
        .min(1, "La duración debe ser al menos 1 día."),

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