import api from "../api/axios";

export const getMembers = async () => {
    const response = await api.get("/members");

    return response.data;
};

interface CreateMemberData {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    gender?: string;
}

export const createMember = async (
    data: CreateMemberData
) => {
    const response = await api.post(
        "/members",
        data
    );

    return response.data;
};