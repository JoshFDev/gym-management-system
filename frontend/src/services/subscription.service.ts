import api from "../api/axios";

export const getSubscriptions = async () => {
    const response = await api.get("/subscriptions");
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