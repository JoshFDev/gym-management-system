import { Schema, model, Document } from "mongoose";
import { PlanStatus } from "./plan.types";

export interface IPlan extends Document {
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    status: PlanStatus;

    createdAt: Date;
    updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        description: {
            type: String,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        durationDays: {
            type: Number,
            required: true,
            min: 1,
        },

        status: {
            type: String,
            enum: Object.values(PlanStatus),
            default: PlanStatus.ACTIVE,
        },
    },
    {
        timestamps: true,
    }
);

const Plan = model<IPlan>(
    "Plan",
    planSchema
);

export default Plan;