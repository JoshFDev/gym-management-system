import Plan from "./plan.model";
import { PlanStatus } from "./plan.types";

import {
    CreatePlanInput,
    UpdatePlanInput,
} from "./plan.validation";

import { ConflictError } from "../../shared/errors/ConflictError";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export const createPlan = async (
    data: CreatePlanInput
) => {

    const existingPlan = await Plan.findOne({
        name: data.name,
    });

    if (existingPlan) {
        throw new ConflictError(
            "Plan already exists."
        );
    }

    const plan = await Plan.create(data);

    return plan;
};

export const getPlans = async () => {

    const plans = await Plan.find()
        .sort({
            createdAt: -1,
        });

    return plans;
};

export const getPlanById = async (
    id: string
) => {

    const plan = await Plan.findById(id);

    if (!plan) {
        throw new NotFoundError(
            "Plan not found."
        );
    }

    return plan;
};

export const updatePlan = async (
    id: string,
    data: UpdatePlanInput
) => {

    const plan = await Plan.findByIdAndUpdate(
        id,
        data,
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (!plan) {
        throw new NotFoundError(
            "Plan not found."
        );
    }

    return plan;
};

export const deactivatePlan = async (
    id: string
) => {

    const plan = await Plan.findByIdAndUpdate(
        id,
        {
            status: PlanStatus.INACTIVE,
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (!plan) {
        throw new NotFoundError(
            "Plan not found."
        );
    }

    return plan;
};