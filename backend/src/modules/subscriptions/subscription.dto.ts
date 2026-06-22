import { ISubscription } from "./subscription.model";

export interface SubscriptionResponse {
    id: string;
    memberId: string;
    planId: string;
    startDate: Date;
    endDate: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toSubscriptionResponse = (
    subscription: ISubscription
): SubscriptionResponse => ({
    id: subscription._id.toString(),
    memberId: subscription.memberId.toString(),
    planId: subscription.planId.toString(),
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    status: subscription.status,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
});