import Member from "../members/member.model";
import Attendance from "./attendance.model";

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

export const getAttendances = async () => {

    const attendances = await Attendance.find()
        .populate(
            "memberId",
            "firstName lastName email phone"
        )
        .sort({
            checkInAt: -1,
        });

    return attendances;
};