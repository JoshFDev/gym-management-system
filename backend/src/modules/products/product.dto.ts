import { IProduct } from "./product.model";

export interface ProductResponse {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toProductResponse = (product: IProduct): ProductResponse => ({
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    category: product.category,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
});
