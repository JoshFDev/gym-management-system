import api from "../api/axios";

export const getPlans = async () => {
    const response = await api.get("/plans");

    return response.data;
};