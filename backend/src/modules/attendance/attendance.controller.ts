import { Request, Response } from "express";

import {
    createAttendance,
    getAttendances,
    getAttendanceReport,
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
    async (req: Request, res: Response) => {

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const filters = {
            gender: req.query.gender as string | undefined,
            dateFrom: req.query.dateFrom as string | undefined,
            dateTo: req.query.dateTo as string | undefined,
            search: req.query.search as string | undefined,
        };
        const result = await getAttendances(page, limit, filters);

        res.status(200).json({
            success: true,
            data: result.items.map(toAttendanceResponse),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });

    }
);

export const report = asyncHandler(
    async (req: Request, res: Response) => {
        const { dateFrom, dateTo } = req.query;
        if (!dateFrom || !dateTo) {
            res.status(400).json({ success: false, message: "dateFrom and dateTo are required" });
            return;
        }
        const result = await getAttendanceReport(dateFrom as string, dateTo as string);
        res.status(200).json({ success: true, ...result });
    }
);