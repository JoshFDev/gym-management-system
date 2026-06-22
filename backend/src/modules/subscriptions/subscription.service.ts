import Member from "../members/member.model";
import Plan from "../plans/plan.model";
import Subscription from "./subscription.model";
import { SubscriptionStatus } from "./subscription.types";
import { CreateSubscriptionInput } from "./subscription.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";


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

export const getSubscriptions = async () => {
    const subscriptions = await Subscription.find()
        .populate("memberId", "firstName lastName email phone")
        .populate("planId", "name price durationDays")
        .sort({ createdAt: -1 });

    return subscriptions;
};