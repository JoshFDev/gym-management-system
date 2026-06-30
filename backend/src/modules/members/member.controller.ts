import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { toMemberResponse } from "./member.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { createMember, getMembers, getMemberById, updateMember, deactivateMember, deleteMember } from "./member.service";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";
import { sendMail, buildEmailHtml } from "../../shared/utils/mail.util";
import QRCode from "qrcode";

export const create = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await createMember(req.body);

        logAudit({
            action: "CREATE",
            entity: "Member",
            entityId: member._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        }).catch(() => {});

        notifyAll({
            type: "member_created",
            title: "Miembro creado",
            message: `${member.firstName} ${member.lastName} fue registrado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        if (member.email) {
            sendMail(
                member.email,
                "Bienvenido a ZenithGym",
                buildEmailHtml(`
                    <p style="color: #333; font-size: 15px; margin: 0 0 12px;">
                        Hola <strong>${member.firstName} ${member.lastName}</strong>,
                    </p>
                    <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 4px;">
                        Has sido registrado en el sistema de <strong>ZenithGym</strong>.
                    </p>
                    <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
                        A partir de ahora puedes acceder a todas las instalaciones y servicios del gimnasio.
                    </p>
                    <div style="background: #F8F8F7; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
                        <table style="width:100%; border-collapse:collapse; font-size: 13px; color: #555;">
                            <tr><td style="padding: 3px 8px 3px 0; color: #888;">Nombre</td><td style="padding: 3px 0; font-weight: 500; color: #1a1a1a;">${member.firstName} ${member.lastName}</td></tr>
                            <tr><td style="padding: 3px 8px 3px 0; color: #888;">Teléfono</td><td style="padding: 3px 0; font-weight: 500; color: #1a1a1a;">${member.phone}</td></tr>
                            ${member.email ? `<tr><td style="padding: 3px 8px 3px 0; color: #888;">Correo</td><td style="padding: 3px 0; font-weight: 500; color: #1a1a1a;">${member.email}</td></tr>` : ""}
                            <tr><td style="padding: 3px 8px 3px 0; color: #888;">Estado</td><td style="padding: 3px 0; font-weight: 500; color: #1a1a1a;">Activo</td></tr>
                        </table>
                    </div>
                    <p style="color: #bbb; font-size: 12px; margin: 0;">
                        Si tienes dudas, acude a la recepción de ZenithGym.
                    </p>
                `)
            ).catch(() => {});
        }

        res.status(201).json({
            success: true,
            message: "Miembro creado exitosamente.",
            data: toMemberResponse(member),
        });
    }
);

export const getAll = asyncHandler(
    async (req: Request, res: Response) => {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const filters = {
            search: req.query.search as string | undefined,
            status: req.query.status as string | undefined,
            gender: req.query.gender as string | undefined,
        };
        const result = await getMembers(page, limit, filters);
        res.status(200).json({
            success: true,
            data: result.items.map(toMemberResponse),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        });
    }
);

export const getById = asyncHandler(
    async (req: Request, res: Response) => {
        const member = await getMemberById(req.params.id as string);
        res.status(200).json({
            success: true,
            data: toMemberResponse(member),
        });
    }
);

export const update = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await updateMember(req.params.id as string, req.body);

        logAudit({
            action: "UPDATE",
            entity: "Member",
            entityId: member._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: req.body,
        }).catch(() => {});

        notifyAll({
            type: "member_updated",
            title: "Miembro actualizado",
            message: `${member.firstName} ${member.lastName} fue modificado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Miembro actualizado exitosamente.",
            data: toMemberResponse(member),
        });
    }
);

export const deactivate = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await deactivateMember(req.params.id as string);

        logAudit({
            action: "DELETE",
            entity: "Member",
            entityId: member._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: { membershipStatus: "inactive" },
        }).catch(() => {});

        notifyAll({
            type: "member_deactivated",
            title: "Miembro desactivado",
            message: `${member.firstName} ${member.lastName} fue desactivado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Miembro desactivado exitosamente.",
            data: toMemberResponse(member),
        });
    }
);

export const remove = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await deleteMember(req.params.id as string);

        logAudit({
            action: "DELETE",
            entity: "Member",
            entityId: member._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        }).catch(() => {});

        notifyAll({
            type: "member_deleted",
            title: "Miembro eliminado",
            message: `${member.firstName} ${member.lastName} fue eliminado del sistema por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Miembro eliminado exitosamente.",
        });
    }
);

export const sendQREmail = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await getMemberById(req.params.id as string);

        if (!member.email) {
            res.status(400).json({ success: false, message: "El miembro no tiene correo electrónico registrado." });
            return;
        }

        const qrBuffer = await QRCode.toBuffer(member._id.toString(), { width: 300, margin: 2 });

        const html = buildEmailHtml(`
            <div style="text-align: center;">
                <p style="color: #333; font-size: 15px; margin: 0 0 16px;">
                    Hola <strong>${member.firstName} ${member.lastName}</strong>,
                </p>
                <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
                    Presenta este código QR en la recepción para registrar tu entrada.
                </p>
                <img src="cid:qrcode" alt="QR de acceso"
                     style="width: 180px; height: 180px; border: 2px solid #D4AF37; border-radius: 8px; padding: 6px;" />
                <p style="color: #bbb; font-size: 11px; margin: 14px 0 0;">
                    Código válido mientras tu membresía esté activa.
                </p>
            </div>
        `);

        await sendMail(member.email, "Tu código QR de acceso - ZenithGym", html, [
            { filename: "qrcode.png", content: qrBuffer, cid: "qrcode" },
        ]);

        res.status(200).json({
            success: true,
            message: "Código QR enviado al correo del miembro.",
        });
    }
);