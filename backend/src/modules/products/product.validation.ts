import { z } from "zod";
import { ProductStatus } from "./product.types";

export const createProductSchema = z.object({
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    price: z.number().min(0, "El precio no puede ser negativo"),
    stock: z.number().int().min(0, "El stock no puede ser negativo"),
    category: z.string().trim().min(1, "La categoría es obligatoria"),
    status: z.enum(ProductStatus).optional(),
    featured: z.boolean().optional(),
    originalPrice: z.number().min(0).optional(),
    salePrice: z.number().min(0).optional(),
    saleEndDate: z.string().datetime().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
