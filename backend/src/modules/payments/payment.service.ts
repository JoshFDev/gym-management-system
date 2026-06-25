import Member from "../members/member.model";
import Subscription from "../subscriptions/subscription.model";
import Payment from "./payment.model";

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

export const getPayments = async () => {

    const payments = await Payment.find()
        .populate(
            "memberId",
            "firstName lastName email phone"
        )
        .populate(
            "subscriptionId",
            "startDate endDate status"
        )
        .sort({
            paidAt: -1,
        });

    return payments;
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