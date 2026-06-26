import api from "../api/axios";

export interface Expense {
    id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
    rent: "Renta",
    salary: "Sueldos",
    maintenance: "Mantenimiento",
    supplies: "Insumos",
    utilities: "Servicios",
    marketing: "Publicidad",
    other: "Otros",
};

export const CATEGORY_COLORS: Record<string, string> = {
    rent: "#e74c3c",
    salary: "#f39c12",
    maintenance: "#2ecc71",
    supplies: "#3498db",
    utilities: "#9b59b6",
    marketing: "#1abc9c",
    other: "#95a5a6",
};

export const getExpenses = async (params?: {
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    page?: number;
    limit?: number;
}) => {
    const response = await api.get("/expenses", { params });
    return response.data;
};

export const getExpenseById = async (id: string) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
};

export const createExpense = async (data: {
    amount: number;
    description: string;
    category: string;
    date?: string;
}) => {
    const response = await api.post("/expenses", data);
    return response.data;
};

export const updateExpense = async (id: string, data: Partial<{
    amount: number;
    description: string;
    category: string;
    date: string;
}>) => {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
};

export const deleteExpense = async (id: string) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
};

export const getExpenseReport = async (dateFrom?: string, dateTo?: string) => {
    const response = await api.get("/expenses/report", { params: { dateFrom, dateTo } });
    return response.data;
};
