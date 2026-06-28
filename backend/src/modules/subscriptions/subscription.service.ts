import Member from "../members/member.model";
import Plan from "../plans/plan.model";
import Subscription from "./subscription.model";
import { SubscriptionStatus } from "./subscription.types";
import { CreateSubscriptionInput } from "./subscription.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { BadRequestError } from "../../shared/errors/BadRequestError";
import { paginate } from "../../shared/utils/pagination";

export const createSubscription = async (
    data: CreateSubscriptionInput
) => {

    const member = await Member.findById(data.memberId);

    if (!member) {
        throw new NotFoundError("Miembro no encontrado.");
    }

    const plan = await Plan.findById(data.planId);

    if (!plan) {
        throw new NotFoundError("Plan no encontrado.");
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

    return await subscription.populate([
        { path: "memberId", select: "firstName lastName email phone" },
        { path: "planId", select: "name price durationDays" },
    ]);
};

export const getSubscriptions = async (
    page: number = 1, limit: number = 20,
    search?: string, planId?: string, status?: string
) => {
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;

    if (planId) filter.planId = planId;

    if (search) {
        const members = await Member.find({
            $or: [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
            ],
        }).select("_id");
        filter.memberId = { $in: members.map(m => m._id) };
    }

    const result = await paginate(
        Subscription,
        filter,
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
            "Suscripción no encontrada."
        );
    }

    const plan = await Plan.findById(
        subscription.planId
    );

    if (!plan) {
        throw new NotFoundError(
            "Plan no encontrado."
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

export const cancelSubscription = async (id: string) => {
    const subscription = await Subscription.findById(id);
    if (!subscription) {
        throw new NotFoundError("Suscripción no encontrada.");
    }
    if (subscription.status === SubscriptionStatus.CANCELLED) {
        throw new BadRequestError("La suscripción ya está cancelada.");
    }
    if (subscription.status === SubscriptionStatus.EXPIRED) {
        throw new BadRequestError("No se puede cancelar una suscripción vencida.");
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    await subscription.save();

    return subscription;
};

export const deleteSubscription = async (id: string) => {
    const subscription = await Subscription.findByIdAndDelete(id);
    if (!subscription) {
        throw new NotFoundError("Suscripción no encontrada.");
    }
    return subscription;
};