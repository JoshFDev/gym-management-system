import { z } from "zod";
import { MembershipStatus } from "./member.types";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId.");

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

    password: z
        .string()
        .min(6, "Password must be at least 6 characters.")
        .optional(),

    phone: z
        .string()
        .trim()
        .min(10, "Phone must be at least 10 digits."),

    birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate must be YYYY-MM-DD.")
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