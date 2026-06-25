import api from "../api/axios";

export const getMembers = async () => {
    const response = await api.get("/members");

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