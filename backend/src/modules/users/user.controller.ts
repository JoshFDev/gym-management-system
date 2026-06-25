import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { getUsers, updateUser, deleteUser } from "./user.service";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";

export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {
        const users = await getUsers();
        res.status(200).json({
            success: true,
            data: users.map((user) => ({
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            })),
        });
    }
);

export const update = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const user = await updateUser(req.params.id as string, req.body);

        await logAudit({
            action: "UPDATE",
            entity: "User",
            entityId: user._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: req.body,
        });

        res.status(200).json({
            success: true,
            message: "User updated successfully.",
            data: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    }
);

export const remove = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const user = await deleteUser(req.params.id as string);

        await logAudit({
            action: "DELETE",
            entity: "User",
            entityId: user._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        res.status(200).json({
            success: true,
            message: "User deactivated successfully.",
            data: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
            },
        });
    }
);