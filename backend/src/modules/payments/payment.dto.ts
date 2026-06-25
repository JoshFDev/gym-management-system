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

    member: {
        id: payment.memberId._id.toString(),
        fullName:
            `${payment.memberId.firstName} ${payment.memberId.lastName}`,
        email: payment.memberId.email,
        phone: payment.memberId.phone,
    },

    subscription: {
        id: payment.subscriptionId._id.toString(),
        startDate: payment.subscriptionId.startDate,
        endDate: payment.subscriptionId.endDate,
        status: payment.subscriptionId.status,
    },

    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    paidAt: payment.paidAt,
    notes: payment.notes,

    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
});