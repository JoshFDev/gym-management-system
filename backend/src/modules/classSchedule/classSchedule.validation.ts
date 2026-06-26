import { z } from "zod";

export const createClassSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    trainer: z.string().trim().min(2, "Trainer name is required"),
    dayOfWeekStart: z.number().int().min(0).max(6),
    dayOfWeekEnd: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
    capacity: z.number().int().min(0, "Capacity cannot be negative"),
    color: z.string().optional(),
});

export const updateClassSchema = createClassSchema.partial();

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
