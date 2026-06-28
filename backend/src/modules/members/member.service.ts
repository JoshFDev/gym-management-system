import Member from "./member.model";
import { MembershipStatus } from "./member.types";
import { CreateMemberInput } from "./member.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { BadRequestError } from "../../shared/errors/BadRequestError";
import { UpdateMemberInput } from "./member.validation";
import AuditLog from "../auditLog/auditLog.model";
import Subscription from "../subscriptions/subscription.model";
import { SubscriptionStatus } from "../subscriptions/subscription.types";
import Payment from "../payments/payment.model";
import { paginate } from "../../shared/utils/pagination";

export const createMember = async (
    data: CreateMemberInput
) => {

    const member = await Member.create({
        ...data,
    });

    return member;
};

export const getMembers = async (
    page: number = 1,
    limit: number = 20,
    filters?: { search?: string; status?: string; gender?: string }
) => {
    const query: Record<string, any> = {};
    if (filters?.search) {
        const re = new RegExp(filters.search, "i");
        query.$or = [
            { firstName: re },
            { lastName: re },
            { email: re },
            { phone: re },
        ];
    }
    if (filters?.status) query.membershipStatus = filters.status;
    if (filters?.gender) query.gender = filters.gender;

    const result = await paginate(Member, query, page, limit, { createdAt: -1 });
    return result;
};

export const getMemberById = async (
    id: string
) => {

    const member = await Member.findById(id);

    if (!member) {
        throw new NotFoundError(
            "Miembro no encontrado."
        );
    }

    return member;
};

export const updateMember = async (
    id: string,
    data: UpdateMemberInput
) => {
    const member = await Member.findById(id);

    if (!member) {
        throw new NotFoundError(
            "Miembro no encontrado."
        );
    }

    Object.assign(member, data);
    await member.save();

    return member;
};

export const deleteMember = async (id: string) => {
    const activeSub = await Subscription.findOne({
        memberId: id,
        status: SubscriptionStatus.ACTIVE,
    });
    if (activeSub) {
        throw new BadRequestError("El miembro tiene una suscripción activa. No se puede eliminar.");
    }

    const hasPayments = await Payment.exists({ memberId: id });
    if (hasPayments) {
        throw new BadRequestError("El miembro tiene pagos registrados. Cancele o marque como reembolso antes de eliminar.");
    }

    const member = await Member.findByIdAndDelete(id);
    if (!member) {
        throw new NotFoundError("Miembro no encontrado.");
    }

    return member;
};

export const deactivateMember = async (
    id: string
) => {

    const member = await Member.findByIdAndUpdate(
        id,
        {
            membershipStatus: MembershipStatus.INACTIVE,
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (!member) {
        throw new NotFoundError(
            "Miembro no encontrado."
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