import api from "../api/axios";

export const getPayments = async () => {
    const response = await api.get("/payments");

    return response.data;
};