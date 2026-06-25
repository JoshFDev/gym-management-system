import Member from "../members/member.model";
import Plan from "../plans/plan.model";
import Subscription from "./subscription.model";
import { SubscriptionStatus } from "./subscription.types";
import { CreateSubscriptionInput } from "./subscription.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { paginate } from "../../shared/utils/pagination";

export const createSubscription = async (
    data: CreateSubscriptionInput
) => {

    const member = await Member.findById(data.memberId);

    if (!member) {
        throw new NotFoundError("Member not found.");
    }

    const plan = await Plan.findById(data.planId);

    if (!plan) {
        throw new NotFoundError("Plan not found.");
    }

    const startDate = data.startDate
        ? new Date(data.startDate)
        : new Date();

    const endDate = new Date(startDate);

    endDate.setDate(
        endDate.getDate() + plan.durationDays
    );

    const subscription = await Subscription.create({
        memberId: member._id,
        planId: plan._id,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
    });

    return subscription;
};

export const getSubscriptions = async (page: number = 1, limit: number = 20) => {
    const result = await paginate(
        Subscription,
        {},
        page,
        limit,
        { createdAt: -1 },
        [
            { path: "memberId", select: "firstName lastName email phone" },
            { path: "planId", select: "name price durationDays" },
        ]
    );

    return result;
};

export const renewSubscription = async (
    id: string
) => {

    const subscription =
        await Subscription.findById(id);

    if (!subscription) {
        throw new NotFoundError(
            "Subscription not found."
        );
    }

    const plan = await Plan.findById(
        subscription.planId
    );

    if (!plan) {
        throw new NotFoundError(
            "Plan not found."
        );
    }

    const currentEndDate =
        new Date(subscription.endDate);

    currentEndDate.setDate(
        currentEndDate.getDate() +
        plan.durationDays
    );

    subscription.endDate =
        currentEndDate;

    await subscription.save();

    return subscription;
};