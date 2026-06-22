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

    member: {
        id: subscription.memberId._id.toString(),
        fullName:
            `${subscription.memberId.firstName} ${subscription.memberId.lastName}`,
        email: subscription.memberId.email,
        phone: subscription.memberId.phone,
    },

    plan: {
        id: subscription.planId._id.toString(),
        name: subscription.planId.name,
        price: subscription.planId.price,
        durationDays: subscription.planId.durationDays,
    },

    startDate: subscription.startDate,
    endDate: subscription.endDate,
    status: subscription.status,

    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
});