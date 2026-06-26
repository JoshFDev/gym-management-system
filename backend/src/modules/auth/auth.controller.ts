import { Request, Response } from "express";

import { toUserResponse } from "./auth.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { AuthRequest } from "../../shared/middlewares/authenticate";
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

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: toUserResponse(user),
        });

    }
);

export const login = asyncHandler(
    async (req: Request, res: Response) => {

        const { token, user } = await loginUser(req.body);

        res.status(200).json({
            success: true,
            message: "Login successful.",
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
            message: "Welcome admin.",
        });

    }
);

export const forgotPasswordHandler = asyncHandler(
    async (req: Request, res: Response) => {

        await forgotPassword(req.body.email);

        res.status(200).json({
            success: true,
            message:
                "If the email exists, a password reset link has been sent.",
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
                "Password reset successfully.",
        });

    }
);

export const changePasswordHandler = asyncHandler(
    async (req: AuthRequest, res: Response) => {

        await changePassword(req.user!.userId, req.body);

        res.status(200).json({
            success: true,
            message: "Password changed successfully.",
        });

    }
);