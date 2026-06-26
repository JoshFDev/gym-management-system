import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { toMemberResponse } from "./member.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { createMember, getMembers, getMemberById, updateMember, deactivateMember } from "./member.service";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await createMember(req.body);

        await logAudit({
            action: "CREATE",
            entity: "Member",
            entityId: member._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        notifyAll({
            type: "member_created",
            title: "Miembro creado",
            message: `${member.firstName} ${member.lastName} fue registrado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({
            success: true,
            message: "Member created successfully.",
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

        await logAudit({
            action: "UPDATE",
            entity: "Member",
            entityId: member._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: req.body,
        });

        notifyAll({
            type: "member_updated",
            title: "Miembro actualizado",
            message: `${member.firstName} ${member.lastName} fue modificado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Member updated successfully.",
            data: toMemberResponse(member),
        });
    }
);

export const deactivate = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await deactivateMember(req.params.id as string);

        await logAudit({
            action: "DELETE",
            entity: "Member",
            entityId: member._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: { membershipStatus: "inactive" },
        });

        notifyAll({
            type: "member_deactivated",
            title: "Miembro desactivado",
            message: `${member.firstName} ${member.lastName} fue desactivado por ${req.user!.role}`,
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Member deactivated successfully.",
            data: toMemberResponse(member),
        });
    }
);