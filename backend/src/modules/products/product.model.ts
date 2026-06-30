import { Schema, model, Document } from "mongoose";
import { ProductStatus } from "./product.types";

export interface IProduct extends Document {
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
    saleEndDate?: Date;
    status: ProductStatus;
    createdAt: Date;
    updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, required: true, min: 0, default: 0 },
        category: { type: String, required: true, trim: true },
        image: { type: String },
        images: [{ type: String }],
        featured: { type: Boolean, default: false },
        originalPrice: { type: Number, min: 0 },
        salePrice: { type: Number, min: 0 },
        saleEndDate: { type: Date },
        status: { type: String, enum: Object.values(ProductStatus), default: ProductStatus.ACTIVE },
    },
    { timestamps: true }
);

const Product = model<IProduct>("Product", productSchema);
export default Product;
