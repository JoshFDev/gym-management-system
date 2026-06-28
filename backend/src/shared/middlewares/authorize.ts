import { Response, NextFunction } from "express";

import { AuthRequest } from "./authenticate";
import { ForbiddenError } from "../errors/ForbiddenError";

export const authorize =
    (...roles: string[]) =>
        (
            req: AuthRequest,
            _res: Response,
            next: NextFunction
        ): void => {

            if (!req.user) {
                throw new ForbiddenError(
                    "Acceso denegado."
                );
            }

            if (!roles.includes(req.user.role)) {
                throw new ForbiddenError(
                    "Permisos insuficientes."
                );
            }

            next();
        };