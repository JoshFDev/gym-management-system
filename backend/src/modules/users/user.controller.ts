import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { getUsers, updateUser, deleteUser } from "./user.service";
import { UserRole } from "../auth/auth.types";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAdmins } from "../../shared/services/socket.service";

export const getAll = asyncHandler(
    async (req: Request, res: Response) => {
        const role = req.query.role as UserRole | undefined;
        const users = await getUsers(role);
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

        notifyAdmins({
            type: "user_updated",
            title: "Usuario actualizado",
            message: `${req.body.firstName || user.firstName} ${req.body.lastName || user.lastName} fue modificado por ${req.user!.role}`,
            userId: user._id.toString(),
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: "Usuario actualizado exitosamente.",
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
        const { user, deleted } = await deleteUser(req.params.id as string);

        await logAudit({
            action: "DELETE",
            entity: "User",
            entityId: user._id.toString(),
            userId: req.user!.userId,
            userRole: req.user!.role,
        });

        notifyAdmins({
            type: "user_deactivated",
            title: deleted ? "Usuario eliminado" : "Usuario desactivado",
            message: deleted
                ? `${user.firstName} ${user.lastName} fue eliminado del sistema por ${req.user!.role}`
                : `${user.firstName} ${user.lastName} fue desactivado por ${req.user!.role}`,
            userId: user._id.toString(),
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: deleted ? "Usuario eliminado exitosamente." : "Usuario desactivado exitosamente.",
            data: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: false,
            },
        });
    }
);