import Member from "./member.model";
import { CreateMemberInput } from "./member.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { UpdateMemberInput } from "./member.validation";

export const createMember = async (
    data: CreateMemberInput
) => {

    const member = await Member.create({
        ...data,
    });

    return member;
};

export const getMembers = async () => {

    const members = await Member.find()
        .sort({
            createdAt: -1,
        });

    return members;
};

export const getMemberById = async (
    id: string
) => {

    const member = await Member.findById(id);

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    return member;
};

export const updateMember = async (
    id: string,
    data: UpdateMemberInput
) => {

    const member = await Member.findByIdAndUpdate(
        id,
        data,
        {
            new: true,
            runValidators: true,
        }
    );

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    return member;
};

export const deactivateMember = async (
    id: string
) => {

    const member = await Member.findByIdAndUpdate(
        id,
        {
            membershipStatus: "inactive",
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!member) {
        throw new NotFoundError(
            "Member not found."
        );
    }

    return member;
};
