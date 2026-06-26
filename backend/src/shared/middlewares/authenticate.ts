import { Request, Response, NextFunction } from "express";
import User from "../../modules/auth/auth.model";

import { verifyToken } from "../../utils/jwt";
import { UnauthorizedError } from "../errors/UnauthorizedError";

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new UnauthorizedError(
            "Access token required."
        );
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
        throw new UnauthorizedError(
            "Invalid token format."
        );
    }

    const payload = verifyToken(token);

    const user = await User.findById(payload.userId).select("isActive role");
    if (!user || !user.isActive) {
        throw new UnauthorizedError(
            "User account is inactive."
        );
    }

    req.user = {
        userId: payload.userId,
        role: user.role,
    };

    next();
};