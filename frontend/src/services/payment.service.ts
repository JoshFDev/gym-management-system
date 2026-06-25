import api from "../api/axios";

export const getPayments = async (page: number = 1, limit: number = 20) => {
    const response = await api.get(`/payments?page=${page}&limit=${limit}`);
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