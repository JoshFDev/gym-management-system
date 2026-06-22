import { z } from "zod";

export const createAttendanceSchema = z.object({
    memberId: z
        .string()
        .min(1, "Member ID is required."),
});

export type CreateAttendanceInput =
    z.infer<typeof createAttendanceSchema>;