import Product from "../products/product.model";
import { ProductStatus } from "../products/product.types";

interface CatalogFilters {
    search?: string;
    category?: string;
}

export const getCatalogProducts = async (filters: CatalogFilters = {}) => {
    const query: Record<string, unknown> = { status: ProductStatus.ACTIVE };
    if (filters.search) query.name = { $regex: filters.search, $options: "i" };
    if (filters.category) query.category = filters.category;

    const products = await Product.find(query).sort({ name: 1 }).lean();
    return products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        originalPrice: p.originalPrice,
        salePrice: p.salePrice,
        saleEndDate: p.saleEndDate?.toISOString(),
        stock: p.stock,
        category: p.category,
        image: p.image,
        images: p.images,
    }));
};

export const getCatalogCategories = async () => {
    const categories = await Product.find({ status: ProductStatus.ACTIVE }).distinct("category");
    return categories.sort();
};
