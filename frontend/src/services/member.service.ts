import api from "../api/axios";

export const getMembers = async () => {
    const response = await api.get("/members");

    return response.data;
};