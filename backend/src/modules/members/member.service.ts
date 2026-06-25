import Member from "./member.model";
import { CreateMemberInput } from "./member.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { UpdateMemberInput } from "./member.validation";
import AuditLog from "../auditLog/auditLog.model";
import { paginate } from "../../shared/utils/pagination";

export const createMember = async (
    data: CreateMemberInput
) => {

    const member = await Member.create({
        ...data,
    });

    return member;
};

export const getMembers = async (page: number = 1, limit: number = 20) => {

    const result = await paginate(Member, {}, page, limit, { createdAt: -1 });

    return result;
};

export const getMemberById = async (
    id: string
) => {

    const member = await Member.findById(id);

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    return member;
};

export const updateMember = async (
    id: string,
    data: UpdateMemberInput
) => {

    const member = await Member.findByIdAndUpdate(
        id,
        data,
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    return member;
};

export const deactivateMember = async (
    id: string
) => {

    const member = await Member.findByIdAndUpdate(
        id,
        {
            membershipStatus: "inactive",
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    return member;
};

interface LogAuditParams {
    action: "CREATE" | "UPDATE" | "DELETE";
    entity: string;
    entityId: string;
    userId: string;
    userRole: string;
    changes?: Record<string, any>;
}

export const logAudit = async (params: LogAuditParams) => {
    await AuditLog.create(params);
};