import api from "../api/axios";

interface LoginData {
    email: string;
    password: string;
}

export const loginRequest = async (
    data: LoginData
) => {
    const response = await api.post(
        "/auth/login",
        data
    );

    return response.data;
};