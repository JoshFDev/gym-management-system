import { z } from "zod";
import { UserRole } from "./auth.types";

export const registerSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(2, "First name must be at least 2 characters.")
        .max(50, "First name cannot exceed 50 characters."),

    lastName: z
        .string()
        .trim()
        .min(2, "Last name must be at least 2 characters.")
        .max(50, "Last name cannot exceed 50 characters."),

    email: z
        .string()
        .email("Invalid email address.")
        .transform((email) => email.toLowerCase()),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters."),

    role: z.enum(UserRole),

    phone: z
        .string()
        .trim()
        .optional(),
});

export const loginSchema = z.object({
    email: z
        .email("Invalid email address.")
        .transform((email) => email.toLowerCase()),

    password: z
        .string()
        .min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;