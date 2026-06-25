import bcrypt from "bcrypt";
import User from "./auth.model";
import { RegisterInput, LoginInput } from "./auth.validation";
import { ConflictError } from "../../shared/errors/ConflictError";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";
import { generateToken } from "../../utils/jwt";
import crypto from "crypto";
import { sendMail } from "../../shared/utils/mail.util";

export const registerUser = async (
    data: RegisterInput
) => {

    const existingUser = await User.findOne({
        email: data.email,
    });

    if (existingUser) {
        throw new ConflictError("Email already registered.");
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

export const loginUser = async (
    data: LoginInput
) => {

    const user = await User
        .findOne({
            email: data.email,
        })
        .select("+password");

    console.log("Email recibido:", data.email);
    console.log("Usuario encontrado:", user);

    if (!user) {
        throw new UnauthorizedError("Invalid email or password.");
    }

    const passwordMatch = await bcrypt.compare(
        data.password,
        user.password
    );

    console.log("Password coincide:", passwordMatch);

    if (!passwordMatch) {
        throw new UnauthorizedError("Invalid email or password.");
    }

    user.lastLogin = new Date();
    console.log("1. lastLogin asignado");

    await user.save();
    console.log("2. Usuario guardado");

    const token = generateToken({
        userId: user._id.toString(),
        role: user.role,
    });
    console.log("3. Token generado");

    return {
        token,
        user,
    };
}
export const forgotPassword = async (
    email: string
) => {
    const user = await User.findOne({
        email,
    });

    if (!user) {
        return;
    }

    const resetToken = crypto
        .randomBytes(32)
        .toString("hex");

    user.resetPasswordToken = resetToken;

    user.resetPasswordExpires = new Date(
        Date.now() + 1000 * 60 * 15
    );

    await user.save();

    const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

    const resetUrl =
        `${frontendUrl}/reset-password/${resetToken}`;

    await sendMail(
        user.email,
        "Reset your ZenithGym password",
        `
            <h2>Password reset request</h2>
            <p>You requested to reset your password.</p>
            <p>Click the link below to create a new password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>This link expires in 15 minutes.</p>
        `
    );
};

export const resetPassword = async (
    token: string,
    password: string
) => {
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: {
            $gt: new Date(),
        },
    });

    if (!user) {
        throw new Error(
            "Invalid or expired reset token."
        );
    }

    const hashedPassword = await bcrypt.hash(
        password,
        12
    );

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
};

