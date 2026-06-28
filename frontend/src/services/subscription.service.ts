import api from "../api/axios";

export const getSubscriptions = async (
    page: number = 1, limit: number = 20,
    extra?: { search?: string; planId?: string; status?: string }
) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (extra?.search) params.set("search", extra.search);
    if (extra?.planId) params.set("planId", extra.planId);
    if (extra?.status) params.set("status", extra.status);
    const response = await api.get(`/subscriptions?${params.toString()}`);
    return response.data;
};

interface CreateSubscriptionData {
    memberId: string;
    planId: string;
}

export const createSubscription = async (data: CreateSubscriptionData) => {
    const response = await api.post("/subscriptions", data);
    return response.data;
};

export const renewSubscription = async (id: string) => {
    const response = await api.put(`/subscriptions/${id}/renew`);
    return response.data;
};

export const cancelSubscription = async (id: string) => {
    const response = await api.patch(`/subscriptions/${id}/cancel`);
    return response.data;
};

export const deleteSubscription = async (id: string) => {
    const response = await api.delete(`/subscriptions/${id}`);
    return response.data;
};