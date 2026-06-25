import { Schema, model, Document, Types } from "mongoose";
import { AttendanceStatus } from "./attendance.types";

export interface IAttendance extends Document {
    memberId: Types.ObjectId;
    checkInAt: Date;
    status: AttendanceStatus;

    createdAt: Date;
    updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
    {
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "Member",
            required: true,
        },

        checkInAt: {
            type: Date,
            default: Date.now,
        },

        status: {
            type: String,
            enum: Object.values(AttendanceStatus),
            default: AttendanceStatus.CHECKED_IN,
        },
    },
    {
        timestamps: true,
    }
);

const Attendance = model<IAttendance>(
    "Attendance",
    attendanceSchema
);

export default Attendance;