import ClassSchedule from "./classSchedule.model";
import { ClassStatus } from "./classSchedule.types";
import { CreateClassInput, UpdateClassInput } from "./classSchedule.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ConflictError } from "../../shared/errors/ConflictError";

async function checkScheduleConflict(trainer: string, dayOfWeekStart: number, dayOfWeekEnd: number, startTime: string, endTime: string, excludeId?: string) {
    const conflicting = await ClassSchedule.findOne({
        _id: excludeId ? { $ne: excludeId } : undefined,
        trainer,
        status: ClassStatus.ACTIVE,
        dayOfWeekStart: { $lte: dayOfWeekEnd },
        dayOfWeekEnd: { $gte: dayOfWeekStart },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
    });
    return conflicting;
}

export const createClass = async (data: CreateClassInput) => {
    const conflict = await checkScheduleConflict(data.trainer, data.dayOfWeekStart, data.dayOfWeekEnd, data.startTime, data.endTime);
    if (conflict) throw new ConflictError("El entrenador ya tiene una clase en ese horario");
    const cls = await ClassSchedule.create(data);
    return cls;
};

export const getClasses = async () => {
    const classes = await ClassSchedule.find({ status: ClassStatus.ACTIVE }).sort({ dayOfWeekStart: 1, startTime: 1 });
    return classes;
};

export const getAllClasses = async () => {
    const classes = await ClassSchedule.find().sort({ dayOfWeekStart: 1, startTime: 1 });
    return classes;
};

export const getClassById = async (id: string) => {
    const cls = await ClassSchedule.findById(id);
    if (!cls) throw new NotFoundError("Clase no encontrada");
    return cls;
};

export const updateClass = async (id: string, data: UpdateClassInput) => {
    if (data.trainer && data.startTime && data.endTime && data.dayOfWeekStart !== undefined && data.dayOfWeekEnd !== undefined) {
        const conflict = await checkScheduleConflict(data.trainer, data.dayOfWeekStart, data.dayOfWeekEnd, data.startTime, data.endTime, id);
        if (conflict) throw new ConflictError("El entrenador ya tiene una clase en ese horario");
    }
    const cls = await ClassSchedule.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
    if (!cls) throw new NotFoundError("Clase no encontrada");
    return cls;
};

export const deactivateClass = async (id: string) => {
    const cls = await ClassSchedule.findByIdAndUpdate(id, { status: ClassStatus.INACTIVE }, { returnDocument: "after" });
    if (!cls) throw new NotFoundError("Clase no encontrada");
    return cls;
};

export const reactivateClass = async (id: string) => {
    const cls = await ClassSchedule.findByIdAndUpdate(id, { status: ClassStatus.ACTIVE }, { returnDocument: "after" });
    if (!cls) throw new NotFoundError("Clase no encontrada");
    return cls;
};

export const deleteClass = async (id: string) => {
    const cls = await ClassSchedule.findByIdAndDelete(id);
    if (!cls) throw new NotFoundError("Clase no encontrada");
    return cls;
};
