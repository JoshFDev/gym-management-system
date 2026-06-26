import bcrypt from "bcrypt";
import Member from "../members/member.model";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";
import { generateToken } from "../../utils/jwt";

interface MemberTokenPayload {
    userId: string;
    role: "member";
}

export const memberLogin = async (email: string, password: string) => {
    const member = await Member.findOne({ email }).select("+password");
    if (!member) throw new UnauthorizedError("Credenciales inválidas");

    const valid = await bcrypt.compare(password, member.password!);
    if (!valid) throw new UnauthorizedError("Credenciales inválidas");

    const token = generateToken({ userId: member._id.toString(), role: "member" } as MemberTokenPayload);

    await Member.findByIdAndUpdate(member._id, { lastLogin: new Date() });

    return {
        token,
        member: {
            id: member._id.toString(),
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            membershipStatus: member.membershipStatus,
        },
    };
};

export const getMemberProfile = async (memberId: string) => {
    const member = await Member.findById(memberId);
    if (!member) throw new NotFoundError("Miembro no encontrado");
    return member;
};
