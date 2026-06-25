import { Schema, model, Document, Types } from "mongoose";
import { SubscriptionStatus } from "./subscription.types";

export interface ISubscription extends Document {
    memberId: Types.ObjectId;
    planId: Types.ObjectId;
    startDate: Date;
    endDate: Date;
    status: SubscriptionStatus;

    createdAt: Date;
    updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
    {
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "Member",
            required: true,
        },

        planId: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: Object.values(SubscriptionStatus),
            default: SubscriptionStatus.ACTIVE,
        },
    },
    {
        timestamps: true,
    }
);

const Subscription = model<ISubscription>(
    "Subscription",
    subscriptionSchema
);

export default Subscription;