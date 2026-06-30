import { Response, NextFunction } from "express";
import User from "../../modules/auth/auth.model";

import { verifyToken } from "../../utils/jwt";
import { UnauthorizedError } from "../errors/UnauthorizedError";
import { asyncHandler } from "./asyncHandler";
import type { AuthRequest } from "./authenticate";

export interface AuthRequest {
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticate = asyncHandler(async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new UnauthorizedError(
            "Token de acceso requerido."
        );
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
        throw new UnauthorizedError(
            "Formato de token inválido."
        );
    }

    const payload = verifyToken(token);

    const user = await User.findById(payload.userId).select("isActive role");
    if (!user || !user.isActive) {
        throw new UnauthorizedError(
            "La cuenta de usuario está inactiva."
        );
    }

    req.user = {
        userId: payload.userId,
        role: user.role,
    };

    next();
});