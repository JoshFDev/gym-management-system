import { IProduct } from "./product.model";

export interface ProductResponse {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    image?: string;
    images?: string[];
    featured?: boolean;
    originalPrice?: number;
    salePrice?: number;
    saleEndDate?: string;
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
    image: product.image,
    images: product.images,
    featured: product.featured,
    originalPrice: product.originalPrice,
    salePrice: product.salePrice,
    saleEndDate: product.saleEndDate?.toISOString(),
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
});
