import Product from "./product.model";
import { ProductStatus } from "./product.types";
import { CreateProductInput, UpdateProductInput } from "./product.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export const createProduct = async (data: CreateProductInput) => {
    const product = await Product.create(data);
    return product;
};

export const getProducts = async () => {
    const products = await Product.find().sort({ createdAt: -1 });
    return products;
};

export const getProductById = async (id: string) => {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError("Producto no encontrado");
    return product;
};

export const updateProduct = async (id: string, data: UpdateProductInput & { image?: string; images?: string[] }) => {
    const product = await Product.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
    if (!product) throw new NotFoundError("Producto no encontrado");
    return product;
};

export const deactivateProduct = async (id: string) => {
    const product = await Product.findByIdAndUpdate(id, { status: ProductStatus.INACTIVE }, { returnDocument: "after" });
    if (!product) throw new NotFoundError("Producto no encontrado");
    return product;
};

export const reactivateProduct = async (id: string) => {
    const product = await Product.findByIdAndUpdate(id, { status: ProductStatus.ACTIVE }, { returnDocument: "after" });
    if (!product) throw new NotFoundError("Producto no encontrado");
    return product;
};

export const getCategories = async () => {
    const categories = await Product.distinct("category", { status: ProductStatus.ACTIVE });
    return categories;
};

export const toggleFeatured = async (id: string) => {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError("Producto no encontrado");
    product.featured = !product.featured;
    await product.save();
    return product;
};
