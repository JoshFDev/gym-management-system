import { Request, Response } from "express";

import {
    createAttendance,
    getAttendances,
} from "./attendance.service";

import { toAttendanceResponse } from "./attendance.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(
    async (req: Request, res: Response) => {

        const attendance = await createAttendance(
            req.body
        );

        notifyAll({
            type: "attendance_created",
            title: "Entrada registrada",
            message: "Nuevo check-in registrado",
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({
            success: true,
            message: "Attendance registered successfully.",
            data: toAttendanceResponse(attendance),
        });

    }
);

export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {

        const attendances = await getAttendances();

        res.status(200).json({
            success: true,
            data: attendances.map(
                toAttendanceResponse
            ),
        });

    }
);