import { z } from "zod";

export const createClassSchema = z.object({
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    trainer: z.string().trim().min(2, "El nombre del entrenador es obligatorio"),
    dayOfWeekStart: z.number().int().min(0).max(6),
    dayOfWeekEnd: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm"),
    capacity: z.number().int().min(0, "La capacidad no puede ser negativa"),
    color: z.string().optional(),
});

export const updateClassSchema = createClassSchema.partial();

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
