import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { createSale, getSales, getSaleById, returnSale } from "./sale.service";
import { toSaleResponse } from "./sale.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";
import { sendMail, buildEmailHtml, GOLD } from "../../shared/utils/mail.util";

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await createSale(req.body, req.user!.userId);

    // Send email confirmation
    if (req.body.buyerEmail) {
        const itemsHtml = sale.items
            .map((i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>$${i.unitPrice.toFixed(2)}</td><td>$${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`)
            .join("");
        const paymentLabel = req.body.paymentMethod === "cash" ? "Efectivo" : req.body.paymentMethod === "card" ? "Tarjeta" : "Transferencia";
        sendMail(
            req.body.buyerEmail,
            "Ticket de compra - ZenithGym",
            buildEmailHtml(`
                <p style="color: #333; font-size: 15px; margin: 0 0 4px;">¡Gracias por tu compra!</p>
                <p style="color: #888; font-size: 12px; margin: 0 0 16px;"><strong>Comprador:</strong> ${sale.buyerName}</p>
                <table style="width:100%; border-collapse:collapse; font-size: 12px; color: #555;">
                    <thead><tr style="background: #070707; color: #fff;">
                        <th style="padding: 8px 10px; text-align:left;">Producto</th>
                        <th style="padding: 8px 10px; text-align:center;">Cant</th>
                        <th style="padding: 8px 10px; text-align:right;">P/U</th>
                        <th style="padding: 8px 10px; text-align:right;">Subtotal</th>
                    </tr></thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot><tr style="font-weight: 700; border-top: 2px solid ${GOLD};">
                        <td colspan="3" style="padding: 8px 10px; text-align:right;">Total</td>
                        <td style="padding: 8px 10px; text-align:right;">$${sale.total.toFixed(2)}</td>
                    </tr></tfoot>
                </table>
                <p style="color: #888; font-size: 12px; margin: 12px 0 0;"><strong>Método de pago:</strong> ${paymentLabel}</p>
            `)
        ).catch(() => {});
    }

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

export const getAll = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const filters = {
        search: req.query.search as string | undefined,
        paymentMethod: req.query.paymentMethod as string | undefined,
        status: req.query.status as string | undefined,
    };
    const result = await getSales(page, limit, filters);
    res.status(200).json({
        success: true,
        data: result.items.map(toSaleResponse),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
    });
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
