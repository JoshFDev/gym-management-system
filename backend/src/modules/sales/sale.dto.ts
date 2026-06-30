import { ISale } from "./sale.model";

export interface SaleResponse {
    id: string;
    items: { productId: string; productName: string; quantity: number; unitPrice: number }[];
    total: number;
    buyerType: string;
    buyerId?: string;
    buyerName: string;
    buyerEmail?: string;
    paymentMethod: string;
    status: string;
    registeredBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toSaleResponse = (sale: ISale): SaleResponse => ({
    id: sale._id.toString(),
    items: sale.items.map((i) => ({
        productId: i.productId.toString(),
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
    })),
    total: sale.total,
    buyerType: sale.buyerType,
    buyerId: sale.buyerId?.toString(),
    buyerName: sale.buyerName,
    buyerEmail: sale.buyerEmail,
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    registeredBy: sale.registeredBy.toString(),
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
});
