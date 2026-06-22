import api from "../api/axios";

export const getAttendances = async () => {
    const response = await api.get("/attendance");

    return response.data;
};