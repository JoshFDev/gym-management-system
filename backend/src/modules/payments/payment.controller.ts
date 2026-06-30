import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { createPayment, getPayments, updatePayment, refundPayment } from "./payment.service";
import { toPaymentResponse } from "./payment.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";
import { sendMail, buildEmailHtml } from "../../shared/utils/mail.util";

export const create = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const payment = await createPayment(req.body);

        const memberEmail = (payment as any).memberId?.email;
        if (memberEmail) {
            const planName = (payment as any).subscriptionId?.planId?.name ?? "Plan";
            const amount = payment.amount;
            const endDate = (payment as any).subscriptionId?.endDate
                ? new Date((payment as any).subscriptionId.endDate).toLocaleDateString("es-ES")
                : "";
            sendMail(
                memberEmail,
                "Confirmación de pago - ZenithGym",
                buildEmailHtml(`
                    <p style="color: #333; font-size: 15px; margin: 0 0 16px;">¡Gracias por tu pago!</p>
                    <table style="width:100%; border-collapse:collapse; font-size: 13px; color: #555;">
                        <tr><td style="padding: 8px 0; border-bottom: 1px solid #ECEBE9; color: #888;">Plan</td><td style="padding: 8px 0; border-bottom: 1px solid #ECEBE9; font-weight: 600; color: #1a1a1a;">${planName}</td></tr>
                        <tr><td style="padding: 8px 0; border-bottom: 1px solid #ECEBE9; color: #888;">Monto</td><td style="padding: 8px 0; border-bottom: 1px solid #ECEBE9; font-weight: 600; color: #1a1a1a;">$${amount}</td></tr>
                        <tr><td style="padding: 8px 0; color: #888;">Vigencia hasta</td><td style="padding: 8px 0; font-weight: 600; color: #1a1a1a;">${endDate}</td></tr>
                    </table>
                    <p style="color: #888; font-size: 12px; margin: 16px 0 0;">Si tienes dudas, contacta a la recepción de ZenithGym.</p>
                `)
            ).catch(() => {});
        }

        await logAudit({
            action: "CREATE",
            entity: "Payment",
            entityId: payment._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        notifyAll({
            type: "payment_created",
            title: "Pago registrado",
            message: `Pago de $${payment.amount} registrado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({
            success: true,
            message: "Pago registrado exitosamente.",
            data: toPaymentResponse(payment),
        });
    }
);

export const getAll = asyncHandler(
    async (req: Request, res: Response) => {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const memberId = req.query.memberId as string | undefined;
        const search = req.query.search as string | undefined;
        const status = req.query.status as string | undefined;
        const planId = req.query.planId as string | undefined;
        const dateFrom = req.query.dateFrom as string | undefined;
        const dateTo = req.query.dateTo as string | undefined;
        const result = await getPayments(page, limit, memberId, search, status, planId, dateFrom, dateTo);
        res.status(200).json({
            success: true,
            data: result.items.map(toPaymentResponse),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
);

export const update = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const payment = await updatePayment(req.params.id as string, req.body);

        await logAudit({
            action: "UPDATE",
            entity: "Payment",
            entityId: payment._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: req.body,
        });

        res.status(200).json({
            success: true,
            message: "Pago actualizado exitosamente.",
            data: toPaymentResponse(payment),
        });
    }
);

export const refund = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const payment = await refundPayment(req.params.id as string);

        logAudit({
            action: "UPDATE",
            entity: "Payment",
            entityId: payment._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: { status: "refunded" },
        }).catch(() => {});

        notifyAll({
            type: "payment_refunded",
            title: "Pago reembolsado",
            message: `Pago de $${payment.amount} reembolsado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Pago reembolsado exitosamente.",
            data: toPaymentResponse(payment),
        });
    }
);