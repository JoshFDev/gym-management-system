import { IClassSchedule } from "./classSchedule.model";

export interface ClassScheduleResponse {
    id: string;
    name: string;
    description?: string;
    trainer: string;
    dayOfWeekStart: number;
    dayOfWeekEnd: number;
    startTime: string;
    endTime: string;
    capacity: number;
    color?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toClassScheduleResponse = (c: IClassSchedule): ClassScheduleResponse => ({
    id: c._id.toString(),
    name: c.name,
    description: c.description,
    trainer: c.trainer,
    dayOfWeekStart: c.dayOfWeekStart,
    dayOfWeekEnd: c.dayOfWeekEnd,
    startTime: c.startTime,
    endTime: c.endTime,
    capacity: c.capacity,
    color: c.color,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
});
