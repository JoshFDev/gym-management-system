import api from "../api/axios";

export interface Sale {
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

interface CreateSaleData {
    items: { productId: string; productName: string; quantity: number; unitPrice: number }[];
    total: number;
    buyerType: string;
    buyerId?: string;
    buyerName: string;
    buyerEmail?: string;
    paymentMethod: string;
}

export const getSales = async (page: number = 1, limit: number = 20, filters?: { search?: string; paymentMethod?: string; status?: string }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.search) params.set("search", filters.search);
    if (filters?.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    if (filters?.status) params.set("status", filters.status);
    const res = await api.get(`/sales?${params.toString()}`);
    return res.data;
};

export const getSaleById = async (id: string) => {
    const res = await api.get(`/sales/${id}`);
    return res.data;
};

export const createSale = async (data: CreateSaleData) => {
    const res = await api.post("/sales", data);
    return res.data;
};

export const returnSale = async (id: string) => {
    const res = await api.post(`/sales/${id}/return`);
    return res.data;
};
