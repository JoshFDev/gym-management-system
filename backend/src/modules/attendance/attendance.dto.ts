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
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toAttendanceResponse = (
    attendance: any
): AttendanceResponse => ({
    id: attendance._id.toString(),

    member: {
        id: attendance.memberId._id.toString(),
        fullName:
            `${attendance.memberId.firstName} ${attendance.memberId.lastName}`,
        email: attendance.memberId.email,
        phone: attendance.memberId.phone,
    },

    checkInAt: attendance.checkInAt,
    status: attendance.status,
    createdAt: attendance.createdAt,
    updatedAt: attendance.updatedAt,
});