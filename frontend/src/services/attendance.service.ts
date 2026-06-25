import api from "../api/axios";

export const getAttendances = async () => {
    const response = await api.get("/attendance");
    return response.data; // { success, data: AttendanceResponse[] }
};

export const createAttendance = async (memberId: string) => {
    const response = await api.post("/attendance", { memberId });
    return response.data;
};