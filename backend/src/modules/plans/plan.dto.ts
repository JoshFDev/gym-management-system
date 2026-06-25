import { IPlan } from "./plan.model";

export interface PlanResponse {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toPlanResponse = (
    plan: IPlan
): PlanResponse => ({
    id: plan._id.toString(),
    name: plan.name,
    description: plan.description,
    price: plan.price,
    durationDays: plan.durationDays,
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
});