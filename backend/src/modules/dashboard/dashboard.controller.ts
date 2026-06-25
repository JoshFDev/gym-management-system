import { Request, Response } from "express";

import { getDashboardStats } from "./dashboard.service";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";

export const getStats = asyncHandler(
    async (_req: Request, res: Response) => {

        const stats = await getDashboardStats();

        res.status(200).json({
            success: true,
            data: stats,
            
        });
        

    }
);