import { ISubscription } from "./subscription.model";

export interface SubscriptionResponse {
    id: string;

    member: {
        id: string;
        fullName: string;
        email?: string;
        phone?: string;
    };

    plan: {
        id: string;
        name: string;
        price: number;
        durationDays: number;
    };

    startDate: Date;
    endDate: Date;
    status: string;

    createdAt: Date;
    updatedAt: Date;
}

export const toSubscriptionResponse = (
    subscription: any
): SubscriptionResponse => ({
    id: subscription._id.toString(),

    member: subscription.memberId?._id
        ? {
            id: subscription.memberId._id.toString(),
            fullName: `${subscription.memberId.firstName ?? ""} ${subscription.memberId.lastName ?? ""}`.trim() || "—",
            email: subscription.memberId.email,
            phone: subscription.memberId.phone,
        }
        : { id: subscription.memberId?.toString?.() ?? "—", fullName: "—" },

    plan: subscription.planId?._id
        ? {
            id: subscription.planId._id.toString(),
            name: subscription.planId.name,
            price: subscription.planId.price,
            durationDays: subscription.planId.durationDays,
        }
        : { id: subscription.planId?.toString?.() ?? "—", name: "—", price: 0, durationDays: 0 },

    startDate: subscription.startDate,
    endDate: subscription.endDate,
    status: subscription.status,

    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
});