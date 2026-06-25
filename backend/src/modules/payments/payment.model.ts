import { Schema, model, Document, Types } from "mongoose";

import {
    PaymentMethod,
    PaymentStatus,
} from "./payment.types";

export interface IPayment extends Document {
    memberId: Types.ObjectId;
    subscriptionId: Types.ObjectId;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: Date;
    notes?: string;

    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "Member",
            required: true,
        },

        subscriptionId: {
            type: Schema.Types.ObjectId,
            ref: "Subscription",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        method: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: true,
        },

        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PAID,
        },

        paidAt: {
            type: Date,
            default: Date.now,
        },

        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const Payment = model<IPayment>(
    "Payment",
    paymentSchema
);

export default Payment;