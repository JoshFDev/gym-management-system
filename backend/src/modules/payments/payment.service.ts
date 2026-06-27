import Member from "../members/member.model";
import Subscription from "../subscriptions/subscription.model";
import Payment from "./payment.model";
import { paginate } from "../../shared/utils/pagination";

import {
    CreatePaymentInput,
    UpdatePaymentInput,
} from "./payment.validation";

import { NotFoundError } from "../../shared/errors/NotFoundError";

export const createPayment = async (
    data: CreatePaymentInput
) => {

    const member = await Member.findById(
        data.memberId
    );

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    const subscription =
        await Subscription.findById(
            data.subscriptionId
        );

    if (!subscription) {
        throw new NotFoundError(
            "Subscription not found."
        );
    }

    const payment = await Payment.create({
        memberId: member._id,
        subscriptionId: subscription._id,
        amount: data.amount,
        method: data.method,
        notes: data.notes,
    });

    const populated = await Payment.findById(payment._id)
        .populate([
            { path: "memberId", select: "firstName lastName email phone" },
            { path: "subscriptionId", populate: { path: "planId", select: "name price" } },
        ]);

    return populated!;
};

export const getPayments = async (
    page: number = 1,
    limit: number = 20,
    memberId?: string,
    search?: string,
    status?: string,
    planId?: string,
    dateFrom?: string,
    dateTo?: string,
) => {

    const filter: Record<string, unknown> = {};
    if (memberId) filter.memberId = memberId;

    if (search) {
        const members = await Member.find({
            $or: [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
            ],
        }).select("_id");
        const ids = members.map(m => m._id);
        filter.memberId = { $in: ids };
    }

    if (status) filter.status = status;

    if (planId) {
        const subscriptions = await Subscription.find({ planId }).select("_id");
        const subIds = subscriptions.map(s => s._id);
        filter.subscriptionId = { $in: subIds };
    }

    if (dateFrom || dateTo) {
        filter.paidAt = {};
        if (dateFrom) (filter.paidAt as Record<string, unknown>).$gte = new Date(dateFrom);
        if (dateTo) (filter.paidAt as Record<string, unknown>).$lte = new Date(dateTo);
    }

    const result = await paginate(
        Payment,
        filter,
        page,
        limit,
        { paidAt: -1 },
        [
            { path: "memberId", select: "firstName lastName email phone" },
            { path: "subscriptionId", populate: { path: "planId", select: "name price" } },
        ]
    );

    return result;
};

export const updatePayment = async (
    id: string,
    data: UpdatePaymentInput
) => {

    const payment = await Payment.findByIdAndUpdate(
        id,
        data,
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (!payment) {
        throw new NotFoundError(
            "Payment not found."
        );
    }

    return payment;
};