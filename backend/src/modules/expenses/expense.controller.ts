import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
    getExpenseReport,
} from "./expense.service";
import { toExpenseResponse } from "./expense.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAdmins } from "../../shared/services/socket.service";
import { EXPENSE_CATEGORY_LABELS } from "./expense.types";

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await createExpense({ ...req.body, createdBy: req.user!.userId });

    await logAudit({ action: "CREATE", entity: "Expense", entityId: expense._id.toString(), userId: req.user!.userId, userRole: req.user!.role, changes: req.body });

    res.status(201).json({ success: true, message: "Gasto creado.", data: toExpenseResponse(expense) });
});

export const getAll = asyncHandler(async (req: Request, res: Response) => {
    const { dateFrom, dateTo, category, page, limit } = req.query;
    const result = await getExpenses({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        category: category as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
        success: true,
        data: result.expenses.map(toExpenseResponse),
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
    });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
    const expense = await getExpenseById(req.params.id as string);
    res.status(200).json({ success: true, data: toExpenseResponse(expense) });
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await updateExpense(req.params.id as string, req.body);

    await logAudit({ action: "UPDATE", entity: "Expense", entityId: expense._id.toString(), userId: req.user!.userId, userRole: req.user!.role, changes: req.body });

    res.status(200).json({ success: true, message: "Gasto actualizado.", data: toExpenseResponse(expense) });
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const expense = await deleteExpense(req.params.id as string);

    await logAudit({ action: "DELETE", entity: "Expense", entityId: expense._id.toString(), userId: req.user!.userId, userRole: req.user!.role });
    notifyAdmins({ type: "info", title: "Gasto eliminado", message: `${EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS] || expense.category}: $${expense.amount}`, timestamp: new Date().toISOString() });

    res.status(200).json({ success: true, message: "Gasto eliminado." });
});

export const report = asyncHandler(async (req: Request, res: Response) => {
    const { dateFrom, dateTo } = req.query;
    const data = await getExpenseReport(dateFrom as string, dateTo as string);
    res.status(200).json({ success: true, data });
});
