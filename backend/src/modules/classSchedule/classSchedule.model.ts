import { Schema, model, Document } from "mongoose";
import { ClassStatus } from "./classSchedule.types";

export interface IClassSchedule extends Document {
    name: string;
    description?: string;
    trainer: string;
    dayOfWeekStart: number;
    dayOfWeekEnd: number;
    startTime: string;
    endTime: string;
    capacity: number;
    color?: string;
    status: ClassStatus;
    createdAt: Date;
    updatedAt: Date;
}

const classScheduleSchema = new Schema<IClassSchedule>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String },
        trainer: { type: String, required: true, trim: true },
        dayOfWeekStart: { type: Number, required: true, min: 0, max: 6 },
        dayOfWeekEnd: { type: Number, required: true, min: 0, max: 6 },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        capacity: { type: Number, required: true, min: 0 },
        color: { type: String, default: "#1a1a1a" },
        status: { type: String, enum: Object.values(ClassStatus), default: ClassStatus.ACTIVE },
    },
    { timestamps: true }
);

const ClassSchedule = model<IClassSchedule>("ClassSchedule", classScheduleSchema);
export default ClassSchedule;
