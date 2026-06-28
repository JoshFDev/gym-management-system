import { Request, Response } from "express";

import {
    createAttendance,
    getAttendances,
    getAttendanceReport,
    getActiveAttendances,
    checkoutAll as checkoutAllAttendances,
} from "./attendance.service";

import { toAttendanceResponse } from "./attendance.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(
    async (req: Request, res: Response) => {

        const { attendance, action } = await createAttendance(
            req.body
        );

        notifyAll({
            type: "attendance_created",
            title: action === "check_out" ? "Salida registrada" : "Entrada registrada",
            message: action === "check_out" ? "Salida registrada" : "Entrada registrada",
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({
            success: true,
            message: action === "check_out" ? "Salida registrada." : "Entrada registrada.",
            data: toAttendanceResponse(attendance),
            action,
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
            memberId: req.query.memberId as string | undefined,
            status: req.query.status as string | undefined,
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

export const getActive = asyncHandler(
    async (_req: Request, res: Response) => {
        const data = await getActiveAttendances();
        res.status(200).json({ success: true, data });
    }
);

export const report = asyncHandler(
    async (req: Request, res: Response) => {
        const { dateFrom, dateTo } = req.query;
        if (!dateFrom || !dateTo) {
            res.status(400).json({ success: false, message: "dateFrom y dateTo son obligatorios" });
            return;
        }
        const result = await getAttendanceReport(dateFrom as string, dateTo as string);
        res.status(200).json({ success: true, ...result });
    }
);

export const checkoutAll = asyncHandler(
    async (_req: Request, res: Response) => {
        const count = await checkoutAllAttendances();

        if (count > 0) {
            notifyAll({
                type: "attendance_created",
                title: "Salidas registradas",
                message: `${count} salida(s) registrada(s)`,
                timestamp: new Date().toISOString(),
            });
        }

        res.status(200).json({
            success: true,
            message: `${count} salida(s) registrada(s).`,
            count,
        });
    }
);