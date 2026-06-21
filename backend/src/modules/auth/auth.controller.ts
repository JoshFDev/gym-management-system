import { Request, Response } from "express";

import { registerUser, loginUser } from "./auth.service";
import { toUserResponse } from "./auth.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { AuthRequest } from "../../shared/middlewares/authenticate";

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