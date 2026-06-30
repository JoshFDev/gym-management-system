import { Request, Response } from "express";
import { getCatalogProducts, getCatalogCategories } from "./memberPortal.service";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";

export const catalog = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
        search: req.query.search as string | undefined,
        category: req.query.category as string | undefined,
    };
    const products = await getCatalogProducts(filters);
    res.status(200).json({ success: true, data: products });
});

export const categories = asyncHandler(async (req: Request, res: Response) => {
    const cats = await getCatalogCategories();
    res.status(200).json({ success: true, data: cats });
});
