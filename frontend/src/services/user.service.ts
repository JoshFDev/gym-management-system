import api from "../api/axios";
import type { UserRole } from "../hooks/useAuth";

export interface UserResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: UserRole;
    isActive?: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    password?: string;
    isActive?: boolean;
}

export const getUsers = async () => {
    const response = await api.get("/users");

    return response.data;
};

export const updateUser = async (
    id: string,
    data: UpdateUserData
) => {
    const response = await api.patch(
        `/users/${id}`,
        data
    );

    return response.data;
};

export const deleteUser = async (
    id: string
) => {
    const response = await api.delete(
        `/users/${id}`
    );

    return response.data;
};