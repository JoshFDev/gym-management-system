import Member from "../members/member.model";
import Attendance from "./attendance.model";
import { paginate } from "../../shared/utils/pagination";

import { CreateAttendanceInput } from "./attendance.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export const createAttendance = async (
    data: CreateAttendanceInput
) => {

    const member = await Member.findById(data.memberId);

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    const attendance = await Attendance.create({
        memberId: member._id,
    });

    return attendance;
};

interface AttendanceFilters {
    gender?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

const buildMemberQuery = async (filters?: AttendanceFilters): Promise<Record<string, unknown>> => {
    const query: Record<string, unknown> = {};
    const memberConditions: Record<string, unknown>[] = [];

    if (filters?.gender) {
        memberConditions.push({ gender: filters.gender });
    }

    if (filters?.search) {
        memberConditions.push({
            $or: [
                { firstName: { $regex: filters.search, $options: "i" } },
                { lastName: { $regex: filters.search, $options: "i" } },
            ],
        });
    }

    if (memberConditions.length > 0) {
        const members = await Member.find({ $and: memberConditions }).select("_id");
        query.memberId = { $in: members.map((m) => m._id) };
    }

    if (filters?.dateFrom || filters?.dateTo) {
        const dateQuery: Record<string, Date> = {};
        if (filters.dateFrom) dateQuery.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) dateQuery.$lte = new Date(filters.dateTo);
        query.checkInAt = dateQuery;
    }

    return query;
};

export const getAttendances = async (page: number = 1, limit: number = 20, filters?: AttendanceFilters) => {
    const query = await buildMemberQuery(filters);

    const result = await paginate(
        Attendance,
        query,
        page,
        limit,
        { checkInAt: -1 },
        { path: "memberId", select: "firstName lastName email phone gender" }
    );

    return result;
};

export const getAttendanceReport = async (dateFrom: string, dateTo: string) => {
    const records = await Attendance.find({
        checkInAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
    }).sort({ checkInAt: 1 });

    const dayCounts: Record<string, number> = {};
    records.forEach((r) => {
        const day = new Date(r.checkInAt).toISOString().slice(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const labels: string[] = [];
    const data: number[] = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        labels.push(key);
        data.push(dayCounts[key] || 0);
    }

    return { labels, data, total: records.length };
};