import api from "../api/axios";

export interface Product {
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

interface CreateProductData {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    featured?: boolean;
    originalPrice?: number;
    salePrice?: number;
    saleEndDate?: string;
}

interface UpdateProductData {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    category?: string;
    status?: string;
    featured?: boolean;
    originalPrice?: number;
    salePrice?: number;
    saleEndDate?: string;
}

export const getProducts = async () => {
    const res = await api.get("/products");
    return res.data;
};

export const getProductById = async (id: string) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
};

export const createProduct = async (data: CreateProductData) => {
    const res = await api.post("/products", data);
    return res.data;
};

export const updateProduct = async (id: string, data: UpdateProductData) => {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
};

export const deactivateProduct = async (id: string) => {
    const res = await api.delete(`/products/${id}/deactivate`);
    return res.data;
};

export const reactivateProduct = async (id: string) => {
    const res = await api.patch(`/products/${id}/reactivate`);
    return res.data;
};

export const getCategories = async () => {
    const res = await api.get("/products/categories");
    return res.data;
};

export const toggleProductFeatured = async (id: string) => {
    const res = await api.patch(`/products/${id}/toggle-featured`);
    return res.data;
};

export const uploadProductImage = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await api.post(`/products/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

export const deleteProductImageByIndex = async (id: string, index: number) => {
    const res = await api.delete(`/products/${id}/images/${index}`);
    return res.data;
};
