import { Request, Response, NextFunction } from "express";

type AsyncController = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

export const asyncHandler =
    (controller: AsyncController) =>
        (req: Request, res: Response, next: NextFunction) => {
            Promise.resolve(controller(req, res, next)).catch(next);
        };