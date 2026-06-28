import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import {
    createClass,
    getClasses,
    getAllClasses,
    getClassById,
    updateClass,
    deactivateClass,
    reactivateClass,
    deleteClass,
} from "./classSchedule.service";
import { toClassScheduleResponse } from "./classSchedule.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cls = await createClass(req.body);

    await logAudit({ action: "CREATE", entity: "ClassSchedule", entityId: cls._id.toString(), userId: req.user!.userId, userRole: req.user!.role });
    notifyAll({ type: "class_created", title: "Clase creada", message: `${cls.name} fue creada por ${req.user!.role}`, timestamp: new Date().toISOString() });

    res.status(201).json({ success: true, message: "Clase creada exitosamente.", data: toClassScheduleResponse(cls) });
});

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
    const classes = await getAllClasses();
    res.status(200).json({ success: true, data: classes.map(toClassScheduleResponse) });
});

export const getActive = asyncHandler(async (_req: Request, res: Response) => {
    const classes = await getClasses();
    res.status(200).json({ success: true, data: classes.map(toClassScheduleResponse) });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
    const cls = await getClassById(req.params.id as string);
    res.status(200).json({ success: true, data: toClassScheduleResponse(cls) });
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cls = await updateClass(req.params.id as string, req.body);

    await logAudit({ action: "UPDATE", entity: "ClassSchedule", entityId: cls._id.toString(), userId: req.user!.userId, userRole: req.user!.role, changes: req.body });
    notifyAll({ type: "class_updated", title: "Clase actualizada", message: `${cls.name} fue modificada por ${req.user!.role}`, timestamp: new Date().toISOString() });

    res.status(200).json({ success: true, message: "Clase actualizada exitosamente.", data: toClassScheduleResponse(cls) });
});

export const deactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cls = await deactivateClass(req.params.id as string);

    await logAudit({ action: "DELETE", entity: "ClassSchedule", entityId: cls._id.toString(), userId: req.user!.userId, userRole: req.user!.role, changes: { status: "inactive" } });
    notifyAll({ type: "class_deactivated", title: "Clase desactivada", message: `${cls.name} fue desactivada por ${req.user!.role}`, timestamp: new Date().toISOString() });

    res.status(200).json({ success: true, message: "Clase desactivada exitosamente.", data: toClassScheduleResponse(cls) });
});

export const activate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cls = await reactivateClass(req.params.id as string);

    await logAudit({ action: "UPDATE", entity: "ClassSchedule", entityId: cls._id.toString(), userId: req.user!.userId, userRole: req.user!.role, changes: { status: "active" } });
    notifyAll({ type: "class_updated", title: "Clase reactivada", message: `${cls.name} fue reactivada por ${req.user!.role}`, timestamp: new Date().toISOString() });

    res.status(200).json({ success: true, message: "Clase reactivada exitosamente.", data: toClassScheduleResponse(cls) });
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cls = await deleteClass(req.params.id as string);

    await logAudit({ action: "DELETE", entity: "ClassSchedule", entityId: cls._id.toString(), userId: req.user!.userId, userRole: req.user!.role, changes: { deleted: true } });
    notifyAll({ type: "class_deactivated", title: "Clase eliminada", message: `${cls.name} fue eliminada permanentemente por ${req.user!.role}`, timestamp: new Date().toISOString() });

    res.status(200).json({ success: true, message: "Clase eliminada permanentemente." });
});
