import { z } from "zod";

export const updateUserSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z
        .enum(["admin", "receptionist", "trainer"])
        .optional(),
    password: z.string().min(8).optional(),
    isActive: z.boolean().optional(),
});