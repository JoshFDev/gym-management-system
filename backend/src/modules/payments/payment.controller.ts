import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { createPayment, getPayments, updatePayment } from "./payment.service";
import { toPaymentResponse } from "./payment.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";
import { sendMail } from "../../shared/utils/mail.util";

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
                `<p>Gracias por tu pago.</p><p>Plan: ${planName}</p><p>Monto: $${amount}</p><p>Fecha de fin de suscripción: ${endDate}</p>`
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
            message: "Payment registered successfully.",
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
            message: "Payment updated successfully.",
            data: toPaymentResponse(payment),
        });
    }
);