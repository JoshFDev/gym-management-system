import api from "../api/axios";

export const getPlans = async () => {
    const response = await api.get("/plans");

    return response.data;
};

interface CreatePlanData {
    name: string;
    description?: string;
    price: number;
    durationDays: number;
}

export const createPlan = async (
    data: CreatePlanData
) => {
    const response = await api.post(
        "/plans",
        data
    );

    return response.data;
};