import { z } from "zod";
import { SaleStatus, BuyerType, PaymentMethod } from "./sale.types";

const saleItemSchema = z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
    unitPrice: z.number().min(0, "El precio unitario no puede ser negativo"),
});

export const createSaleSchema = z.object({
    items: z.array(saleItemSchema).min(1, "Debe tener al menos un item"),
    total: z.number().min(0, "El total no puede ser negativo"),
    buyerType: z.enum(BuyerType),
    buyerId: z.string().optional(),
    buyerName: z.string().trim().min(1, "El nombre del comprador es obligatorio"),
    buyerEmail: z.string().email().optional(),
    paymentMethod: z.enum(PaymentMethod),
    status: z.enum(SaleStatus).optional(),
});

export const returnSaleSchema = z.object({});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
