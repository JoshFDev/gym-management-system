import bcrypt from "bcrypt";
import User from "./auth.model";
import { RegisterInput } from "./auth.validation";

export const registerUser = async (
    data: RegisterInput
) => {

    const existingUser = await User.findOne({
        email: data.email,
    });

    if (existingUser) {
        throw new Error("Email already registered.");
    }

    const hashedPassword = await bcrypt.hash(
        data.password,
        12
    );

    const user = await User.create({
        ...data,
        password: hashedPassword,
    });

    return user;

};