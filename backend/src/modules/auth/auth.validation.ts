import { z } from "zod";
import { UserRole } from "./auth.types";

export const registerSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres.")
        .max(50, "El nombre no puede exceder 50 caracteres."),

    lastName: z
        .string()
        .trim()
        .min(2, "El apellido debe tener al menos 2 caracteres.")
        .max(50, "El apellido no puede exceder 50 caracteres."),

    email: z
        .string()
        .email("Correo electrónico inválido.")
        .transform((email) => email.toLowerCase()),

    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres."),

    role: z.enum(UserRole),

    phone: z
        .string()
        .trim()
        .optional(),
});

export const loginSchema = z.object({
    email: z
        .email("Correo electrónico inválido.")
        .transform((email) => email.toLowerCase()),

    password: z
        .string()
        .min(1, "La contraseña es obligatoria."),
});

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .email("Correo inválido"),
});

export const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(
            8,
            "La contraseña debe tener al menos 8 caracteres"
        ),
});


export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;