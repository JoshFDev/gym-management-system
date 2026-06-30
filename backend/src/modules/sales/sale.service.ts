import Sale from "./sale.model";
import Product from "../products/product.model";
import { CreateSaleInput } from "./sale.validation";
import { SaleStatus } from "./sale.types";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { paginate } from "../../shared/utils/pagination";

export const createSale = async (data: CreateSaleInput, registeredBy: string) => {
    // Validate stock and deduct
    for (const item of data.items) {
        const product = await Product.findById(item.productId);
        if (!product) throw new NotFoundError(`Producto ${item.productName} no encontrado`);
        if (product.stock < item.quantity) {
            throw new ConflictError(`Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${item.quantity}`);
        }
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    const sale = await Sale.create({
        ...data,
        registeredBy,
        items: data.items.map((i) => ({ ...i, productId: i.productId })),
    });

    return sale;
};

export const getSales = async (
    page: number = 1,
    limit: number = 20,
    filters?: { search?: string; paymentMethod?: string; status?: string }
) => {
    const query: Record<string, unknown> = {};
    if (filters?.paymentMethod) query.paymentMethod = filters.paymentMethod;
    if (filters?.status) query.status = filters.status;
    if (filters?.search) {
        query.buyerName = { $regex: filters.search, $options: "i" };
    }
    const result = await paginate(Sale, query, page, limit, { createdAt: -1 });
    return result;
};

export const getSaleById = async (id: string) => {
    const sale = await Sale.findById(id);
    if (!sale) throw new NotFoundError("Venta no encontrada");
    return sale;
};

export const returnSale = async (id: string) => {
    const sale = await Sale.findById(id);
    if (!sale) throw new NotFoundError("Venta no encontrada");
    if (sale.status === SaleStatus.RETURNED) throw new ConflictError("La venta ya fue devuelta");

    // Restore stock
    for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }

    sale.status = SaleStatus.RETURNED;
    await sale.save();
    return sale;
};
