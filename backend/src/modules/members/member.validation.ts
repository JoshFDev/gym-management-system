import { z } from "zod";
import { MembershipStatus } from "./member.types";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido.");

export const createMemberSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres."),

    lastName: z
        .string()
        .trim()
        .min(2, "El apellido debe tener al menos 2 caracteres."),

    email: z
        .email("Correo electrónico inválido.")
        .optional(),

    phone: z
        .string()
        .trim()
        .min(10, "El teléfono debe tener al menos 10 dígitos."),

    birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de nacimiento debe ser YYYY-MM-DD.")
        .optional(),

    gender: z
        .enum(["male", "female", "other"])
        .optional(),

    address: z
        .string()
        .optional(),

    emergencyContact: z
        .string()
        .optional(),

    membershipStatus: z
        .enum(MembershipStatus)
        .optional(),

    notes: z
        .string()
        .optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export type UpdateMemberInput =
    z.infer<typeof updateMemberSchema>;

export type CreateMemberInput =
    z.infer<typeof createMemberSchema>;