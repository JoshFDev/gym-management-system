import { IPayment } from "./payment.model";

export interface PaymentResponse {
    id: string;

    member: {
        id: string;
        fullName: string;
        email?: string;
        phone?: string;
    };

    subscription: {
        id: string;
        startDate: Date;
        endDate: Date;
        status: string;
        planName: string;
        planPrice: number;
    };

    amount: number;
    method: string;
    status: string;
    paidAt: Date;
    notes?: string;

    createdAt: Date;
    updatedAt: Date;
}

export const toPaymentResponse = (
    payment: any
): PaymentResponse => ({
    id: payment._id.toString(),

    member: payment.memberId?._id
        ? {
            id: payment.memberId._id.toString(),
            fullName: `${payment.memberId.firstName ?? ""} ${payment.memberId.lastName ?? ""}`.trim() || "—",
            email: payment.memberId.email,
            phone: payment.memberId.phone,
        }
        : { id: payment.memberId?.toString?.() ?? "—", fullName: "—" },

    subscription: payment.subscriptionId?._id
        ? {
            id: payment.subscriptionId._id.toString(),
            startDate: payment.subscriptionId.startDate,
            endDate: payment.subscriptionId.endDate,
            status: payment.subscriptionId.status,
            planName: payment.subscriptionId.planId?.name ?? "",
            planPrice: payment.subscriptionId.planId?.price ?? 0,
        }
        : { id: payment.subscriptionId?.toString?.() ?? "—", startDate: new Date(0), endDate: new Date(0), status: "—", planName: "", planPrice: 0 },

    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    paidAt: payment.paidAt,
    notes: payment.notes,

    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
});