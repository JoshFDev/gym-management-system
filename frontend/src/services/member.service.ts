import api from "../api/axios";

export const getMembers = async (page: number = 1, limit: number = 20, filters?: { search?: string; status?: string; gender?: string }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.gender) params.set("gender", filters.gender);
    const response = await api.get(`/members?${params.toString()}`);

    return response.data;
};

export const getMemberById = async (id: string) => {
    const response = await api.get(`/members/${id}`);
    return response.data;
};

interface CreateMemberData {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    gender?: string;
    birthDate?: string;
    address?: string;
    emergencyContact?: string;
    notes?: string;
}
interface UpdateMemberData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    gender?: string;
    birthDate?: string;
    address?: string;
    emergencyContact?: string;
    notes?: string;
    membershipStatus?: string;
}

export const updateMember = async (
    id: string,
    data: UpdateMemberData
) => {
    const response = await api.put(
        `/members/${id}`,
        data
    );

    return response.data;
};

export const deactivateMember = async (
    id: string
) => {
    const response = await api.delete(
        `/members/${id}`
    );

    return response.data;
};
export const createMember = async (
    data: CreateMemberData
) => {
    const response = await api.post(
        "/members",
        data
    );

    return response.data;
};