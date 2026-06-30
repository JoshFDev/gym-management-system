import api from "../api/axios";

interface LoginData { email: string; password: string }
interface RegisterData {
    firstName: string; lastName: string;
    email: string; password: string;
    role: string; phone?: string;
}

export const loginRequest = async (data: LoginData) => {
    const response = await api.post("/auth/login", data);
    return response.data;
};

export const registerRequest = async (data: RegisterData) => {
    const response = await api.post("/auth/register", data);
    return response.data;
};
export const forgotPasswordRequest = async (email: string) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
};

export const resetPasswordRequest = async (
    token: string,
    password: string
) => {
    const response = await api.post(
        `/auth/reset-password/${token}`,
        {
            password,
        }
    );

    return response.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await api.put("/auth/change-password", { currentPassword, newPassword });
    return response.data;
};

export const getProfile = async () => {
    const response = await api.get("/auth/profile");
    return response.data;
};

export const adminCheck = async () => {
    const response = await api.get("/auth/admin");
    return response.data;
};