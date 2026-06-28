import bcrypt from "bcrypt";
import User from "./auth.model";
import { RegisterInput, LoginInput, ChangePasswordInput } from "./auth.validation";
import { ConflictError } from "../../shared/errors/ConflictError";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";
import { BadRequestError } from "../../shared/errors/BadRequestError";
import { generateToken } from "../../utils/jwt";
import crypto from "crypto";
import { sendMail } from "../../shared/utils/mail.util";

const hashToken = (token: string) =>
    crypto.createHash("sha256").update(token).digest("hex");

export const registerUser = async (
    data: RegisterInput
) => {

    const existingUser = await User.findOne({
        email: data.email,
    });

    if (existingUser) {
        throw new ConflictError("El correo ya está registrado.");
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

    if (!user) {
        throw new UnauthorizedError("Correo o contraseña inválidos.");
    }

    const passwordMatch = await bcrypt.compare(
        data.password,
        user.password
    );

    if (!passwordMatch) {
        throw new UnauthorizedError("Correo o contraseña inválidos.");
    }

    user.lastLogin = new Date();

    await user.save();

    const token = generateToken({
        userId: user._id.toString(),
        role: user.role,
    });

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

    user.resetPasswordToken = hashToken(resetToken);

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
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: {
            $gt: new Date(),
        },
    });

    if (!user) {
        throw new BadRequestError(
            "Token de restablecimiento inválido o expirado."
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

export const changePassword = async (
    userId: string,
    data: ChangePasswordInput
) => {
    const user = await User.findById(userId).select("+password");

    if (!user) {
        throw new BadRequestError("Usuario no encontrado.");
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.password);
    if (!isMatch) {
        throw new UnauthorizedError("La contraseña actual es incorrecta.");
    }

    user.password = await bcrypt.hash(data.newPassword, 12);
    await user.save();
};

