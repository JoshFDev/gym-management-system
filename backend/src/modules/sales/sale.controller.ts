import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { createSale, getSales, getSaleById, returnSale } from "./sale.service";
import { toSaleResponse } from "./sale.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await createSale(req.body, req.user!.userId);

    await logAudit({
        action: "CREATE",
        entity: "Sale",
        entityId: sale._id.toString(),
        userId: req.user!.userId,
        userRole: req.user!.role,
    });

    notifyAll({
        type: "sale_created",
        title: "Venta realizada",
        message: `Venta por $${sale.total} registrada por ${req.user!.role}`,
        timestamp: new Date().toISOString(),
    });

    res.status(201).json({ success: true, message: "Venta registrada exitosamente.", data: toSaleResponse(sale) });
});

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
    const sales = await getSales();
    res.status(200).json({ success: true, data: sales.map(toSaleResponse) });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
    const sale = await getSaleById(req.params.id as string);
    res.status(200).json({ success: true, data: toSaleResponse(sale) });
});

export const returnSaleHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await returnSale(req.params.id as string);

    await logAudit({
        action: "UPDATE",
        entity: "Sale",
        entityId: sale._id.toString(),
        userId: req.user!.userId,
        userRole: req.user!.role,
        changes: { status: "returned" },
    });

    notifyAll({
        type: "sale_returned",
        title: "Devolución registrada",
        message: `Devolución de venta por $${sale.total} procesada por ${req.user!.role}`,
        timestamp: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: "Devolución procesada exitosamente.", data: toSaleResponse(sale) });
});
