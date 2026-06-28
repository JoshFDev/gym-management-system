import api from "../api/axios";

export const getPayments = async (
    page: number = 1,
    limit: number = 20,
    filters?: { search?: string; status?: string; planId?: string; dateFrom?: string; dateTo?: string; memberId?: string }
) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
    }
    const response = await api.get(`/payments?${params.toString()}`);
    return response.data;
};

interface CreatePaymentData {
    memberId: string;
    subscriptionId: string;
    amount: number;
    method: string;
    notes?: string;
}

interface UpdatePaymentData {
    amount?: number;
    method?: string;
    status?: string;
    notes?: string;
}

export const createPayment = async (data: CreatePaymentData) => {
    const response = await api.post("/payments", data);
    return response.data;
};

export const updatePayment = async (id: string, data: UpdatePaymentData) => {
    const response = await api.put(`/payments/${id}`, data);
    return response.data;
};

export const refundPayment = async (id: string) => {
    const response = await api.post(`/payments/${id}/refund`);
    return response.data;
};