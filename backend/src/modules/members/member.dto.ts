import { IMember } from "./member.model";

export interface MemberResponse {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    birthDate?: Date;
    gender?: string;
    address?: string;
    emergencyContact?: string;
    membershipStatus: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toMemberResponse = (
    member: IMember
): MemberResponse => ({
    id: member._id.toString(),
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    birthDate: member.birthDate,
    gender: member.gender,
    address: member.address,
    emergencyContact: member.emergencyContact,
    membershipStatus: member.membershipStatus,
    notes: member.notes,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
});