import { Schema, model, Document } from "mongoose";
import { MembershipStatus } from "./member.types";

export interface IMember extends Document {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    birthDate?: Date;
    gender?: string;
    address?: string;
    emergencyContact?: string;
    membershipStatus: MembershipStatus;
    notes?: string;

    createdAt: Date;
    updatedAt: Date;
}

const memberSchema = new Schema<IMember>(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        birthDate: {
            type: Date,
        },

        gender: {
            type: String,
        },

        address: {
            type: String,
        },

        emergencyContact: {
            type: String,
        },

        membershipStatus: {
            type: String,
            enum: Object.values(MembershipStatus),
            default: MembershipStatus.ACTIVE,
        },

        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const Member = model<IMember>(
    "Member",
    memberSchema
);

export default Member;