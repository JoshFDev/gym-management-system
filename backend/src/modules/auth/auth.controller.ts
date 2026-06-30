import { Request, Response } from "express";

import { toUserResponse } from "./auth.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { logAudit } from "../auditLog/auditLog.service";
import {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    changePassword,
} from "./auth.service";

export const register = asyncHandler(
    async (req: Request, res: Response) => {

        const user = await registerUser(req.body);

        logAudit({
            action: "CREATE",
            entity: "User",
            entityId: user._id.toString(),
            userId: user._id.toString(),
            userRole: user.role,
        }).catch(() => {});

        res.status(201).json({
            success: true,
            message: "Usuario registrado exitosamente.",
            data: toUserResponse(user),
        });

    }
);

export const login = asyncHandler(
    async (req: Request, res: Response) => {

        const { token, user } = await loginUser(req.body);

        logAudit({
            action: "UPDATE",
            entity: "User",
            entityId: user._id.toString(),
            userId: user._id.toString(),
            userRole: user.role,
            changes: { action: "login" },
        }).catch(() => {});

        res.status(200).json({
            success: true,
            message: "Inicio de sesión exitoso.",
            data: {
                token,
                user: toUserResponse(user),
            },
        });

    }
);

export const profile = asyncHandler(
    async (req: AuthRequest, res: Response) => {

        res.status(200).json({
            success: true,
            data: req.user,
        });

    }
);
export const adminOnly = asyncHandler(
    async (_req: AuthRequest, res: Response) => {

        res.status(200).json({
            success: true,
            message: "Bienvenido admin.",
        });

    }
);

export const forgotPasswordHandler = asyncHandler(
    async (req: Request, res: Response) => {

        await forgotPassword(req.body.email);

        res.status(200).json({
            success: true,
            message:
                "Si el correo existe, se ha enviado un enlace de restablecimiento.",
        });

    }
);

export const resetPasswordHandler = asyncHandler(
    async (req: Request, res: Response) => {

        await resetPassword(
            req.params.token as string,
            req.body.password
        );

        res.status(200).json({
            success: true,
            message:
                "Contraseña restablecida exitosamente.",
        });

    }
);

export const changePasswordHandler = asyncHandler(
    async (req: AuthRequest, res: Response) => {

        await changePassword(req.user!.userId, req.body);

        logAudit({
            action: "UPDATE",
            entity: "User",
            entityId: req.user!.userId,
            userId: req.user!.userId,
            userRole: req.user!.role,
            changes: { action: "change_password" },
        }).catch(() => {});

        res.status(200).json({
            success: true,
            message: "Contraseña cambiada exitosamente.",
        });

    }
);