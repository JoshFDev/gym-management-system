import api from "../api/axios";

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    image?: string;
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
}

interface UpdateProductData {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    category?: string;
    status?: string;
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

export const uploadProductImage = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await api.post(`/products/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

export const deleteProductImage = async (id: string) => {
    const res = await api.delete(`/products/${id}/image`);
    return res.data;
};
