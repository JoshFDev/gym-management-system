import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido.");

export const createAttendanceSchema = z.object({
    memberId: objectId,
});

export type CreateAttendanceInput =
    z.infer<typeof createAttendanceSchema>;