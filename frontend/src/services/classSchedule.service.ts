import api from "../api/axios";

export interface ClassSchedule {
    id: string;
    name: string;
    description?: string;
    trainer: string;
    dayOfWeekStart: number;
    dayOfWeekEnd: number;
    startTime: string;
    endTime: string;
    capacity: number;
    color?: string;
    status: string;
}

export const getClasses = async () => {
    const response = await api.get("/classes");
    return response.data;
};

export const getActiveClasses = async () => {
    const response = await api.get("/classes/active");
    return response.data;
};

export const getClassById = async (id: string) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
};

interface CreateClassData {
    name: string;
    description?: string;
    trainer: string;
    dayOfWeekStart: number;
    dayOfWeekEnd: number;
    startTime: string;
    endTime: string;
    capacity: number;
    color?: string;
}

export const createClass = async (data: CreateClassData) => {
    const response = await api.post("/classes", data);
    return response.data;
};

export const updateClass = async (id: string, data: Partial<CreateClassData>) => {
    const response = await api.put(`/classes/${id}`, data);
    return response.data;
};

export const deactivateClass = async (id: string) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
};

export const reactivateClass = async (id: string) => {
    const response = await api.patch(`/classes/${id}/reactivate`);
    return response.data;
};

export const deleteClass = async (id: string) => {
    const response = await api.delete(`/classes/${id}/permanent`);
    return response.data;
};
