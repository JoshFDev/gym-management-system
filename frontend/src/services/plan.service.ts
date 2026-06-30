import api from "../api/axios";

export const getPlans = async (search?: string) => {
    const response = await api.get("/plans", { params: { search } });

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

interface UpdatePlanData {
    name?: string;
    description?: string;
    price?: number;
    durationDays?: number;
    status?: string;
}

export const updatePlan = async (
    id: string,
    data: UpdatePlanData
) => {
    const response = await api.put(
        `/plans/${id}`,
        data
    );

    return response.data;
};

export const getPlanById = async (id: string) => {
    const response = await api.get(`/plans/${id}`);
    return response.data;
};

export const deactivatePlan = async (
    id: string
) => {
    const response = await api.delete(
        `/plans/${id}`
    );

    return response.data;
};