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

    return payment;
};

export const getPayments = async (page: number = 1, limit: number = 20) => {

    const result = await paginate(
        Payment,
        {},
        page,
        limit,
        { paidAt: -1 },
        [
            { path: "memberId", select: "firstName lastName email phone" },
            { path: "subscriptionId", select: "startDate endDate status" },
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