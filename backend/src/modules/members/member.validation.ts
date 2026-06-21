import { z } from "zod";
import { MembershipStatus } from "./member.types";

export const createMemberSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(2, "First name must be at least 2 characters."),

    lastName: z
        .string()
        .trim()
        .min(2, "Last name must be at least 2 characters."),

    email: z
        .email("Invalid email address.")
        .optional(),

    phone: z
        .string()
        .trim()
        .min(10, "Phone must be at least 10 digits."),

    birthDate: z
        .string()
        .optional(),

    gender: z
        .string()
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