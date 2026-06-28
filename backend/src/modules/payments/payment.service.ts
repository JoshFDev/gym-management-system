import Member from "../members/member.model";
import Subscription from "../subscriptions/subscription.model";
import Payment from "./payment.model";
import { paginate } from "../../shared/utils/pagination";

import {
    CreatePaymentInput,
    UpdatePaymentInput,
} from "./payment.validation";

import { NotFoundError } from "../../shared/errors/NotFoundError";
import { BadRequestError } from "../../shared/errors/BadRequestError";

export const createPayment = async (
    data: CreatePaymentInput
) => {

    const member = await Member.findById(
        data.memberId
    );

    if (!member) {
        throw new NotFoundError(
            "Miembro no encontrado."
        );
    }

    const subscription =
        await Subscription.findById(
            data.subscriptionId
        );

    if (!subscription) {
        throw new NotFoundError(
            "Suscripción no encontrada."
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
            "Pago no encontrado."
        );
    }

    return payment;
};

export const refundPayment = async (id: string) => {
    const payment = await Payment.findById(id);
    if (!payment) {
        throw new NotFoundError("Pago no encontrado.");
    }
    if (payment.status !== "paid") {
        throw new BadRequestError("Solo se pueden reembolsar pagos con estado 'pagado'.");
    }

    payment.status = "refunded" as any;
    payment.notes = payment.notes
        ? `${payment.notes} [Reembolsado ${new Date().toLocaleDateString("es-MX")}]`
        : `Reembolsado ${new Date().toLocaleDateString("es-MX")}`;
    await payment.save();

    return payment;
};