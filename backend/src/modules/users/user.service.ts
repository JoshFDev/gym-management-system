import bcrypt from "bcrypt";

import User from "../auth/auth.model";
import { UserRole } from "../auth/auth.types";
import { NotFoundError } from "../../shared/errors/NotFoundError";

interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?:UserRole;
    password?: string;
    isActive?: boolean;
}

export const getUsers = async () => {
    const users = await User.find()
        .sort({ createdAt: -1 });

    return users;
};

export const updateUser = async (
    id: string,
    data: UpdateUserData
) => {
    const user = await User.findById(id);

    if (!user) {
        throw new NotFoundError("User not found.");
    }

    if (data.firstName !== undefined) {
        user.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
        user.lastName = data.lastName;
    }

    if (data.email !== undefined) {
        user.email = data.email;
    }

    if (data.phone !== undefined) {
        user.phone = data.phone;
    }

    if (data.role !== undefined) {
        user.role = data.role;
    }

    if (data.isActive !== undefined) {
        user.isActive = data.isActive;
    }

    if (data.password) {
        user.password = await bcrypt.hash(
            data.password,
            12
        );
    }

    await user.save();

    return user;
};

export const deleteUser = async (
    id: string
) => {
    const user = await User.findById(id);

    if (!user) {
        throw new NotFoundError("User not found.");
    }

    user.isActive = false;

    await user.save();

    return user;
};