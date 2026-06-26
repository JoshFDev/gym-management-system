import { IAttendance } from "./attendance.model";

export interface AttendanceResponse {
    id: string;

    member: {
        id: string;
        fullName: string;
        email?: string;
        phone?: string;
    };

    checkInAt: Date;
    checkOutAt?: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toAttendanceResponse = (
    attendance: any
): AttendanceResponse => ({
    id: attendance._id.toString(),

    member: attendance.memberId?._id
        ? {
            id: attendance.memberId._id.toString(),
            fullName: `${attendance.memberId.firstName ?? ""} ${attendance.memberId.lastName ?? ""}`.trim() || "—",
            email: attendance.memberId.email,
            phone: attendance.memberId.phone,
        }
        : { id: attendance.memberId?.toString?.() ?? "—", fullName: "—" },

    checkInAt: attendance.checkInAt,
    checkOutAt: attendance.checkOutAt ?? undefined,
    status: attendance.status,
    createdAt: attendance.createdAt,
    updatedAt: attendance.updatedAt,
});