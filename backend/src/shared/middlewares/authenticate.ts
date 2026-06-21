import { Request, Response, NextFunction } from "express";

import { verifyToken } from "../../utils/jwt";
import { UnauthorizedError } from "../errors/UnauthorizedError";

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticate = (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): void => {

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

    req.user = {
        userId: payload.userId,
        role: payload.role,
    };

    next();
};