import api from "../api/axios";

export interface CatalogProduct {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    salePrice?: number;
    saleEndDate?: string;
    stock: number;
    category: string;
    image?: string;
    images?: string[];
}

export const getMemberCatalog = async (filters?: { search?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.category) params.set("category", filters.category);
    const q = params.toString();
    const r = await api.get(`/member/products${q ? `?${q}` : ""}`);
    return r.data.data as CatalogProduct[];
};

export const getMemberCategories = async () => {
    const r = await api.get("/member/categories");
    return r.data.data as string[];
};
