import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { toMemberResponse } from "./member.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { createMember, getMembers, getMemberById, updateMember, deactivateMember } from "./member.service";
import { logAudit } from "../auditLog/auditLog.service";

export const create = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const member = await createMember(req.body);

        await logAudit({
            action: "CREATE",
            entity: "Member",
            entityId: member._id.toString(),  // ← .toString()
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        res.status(201).json({
            success: true,
            message: "Member created successfully.",
            data: toMemberResponse(member),
        });
    }
);

export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {
        const members = await getMembers();
        res.status(200).json({
            success: true,
            data: members.map(toMemberResponse),
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
            entityId: member._id.toString(),  // ← .toString()
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: req.body,
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
            entityId: member._id.toString(),  // ← .toString()
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: { membershipStatus: "inactive" },
        });

        res.status(200).json({
            success: true,
            message: "Member deactivated successfully.",
            data: toMemberResponse(member),
        });
    }
);