import bcrypt from "bcrypt";
import User from "./auth.model";
import { RegisterInput, LoginInput, ChangePasswordInput } from "./auth.validation";
import { ConflictError } from "../../shared/errors/ConflictError";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";
import { BadRequestError } from "../../shared/errors/BadRequestError";
import { generateToken } from "../../utils/jwt";
import crypto from "crypto";
import { sendMail, buildEmailHtml, GOLD } from "../../shared/utils/mail.util";

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
        "Restablece tu contraseña - ZenithGym",
        buildEmailHtml(`
            <p style="color: #333; font-size: 15px; margin: 0 0 16px;">
                Hola <strong>${user.firstName} ${user.lastName}</strong>,
            </p>
            <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
                Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:
            </p>
            <div style="text-align: center; margin: 22px 0;">
                <a href="${resetUrl}"
                   style="display: inline-block; padding: 11px 28px; background: ${GOLD}; color: #fff; text-decoration: none; border-radius: 7px; font-size: 14px; font-weight: 600;">
                    Restablecer contraseña
                </a>
            </div>
            <p style="color: #bbb; font-size: 12px; margin: 0;">
                Este enlace expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.
            </p>
        `)
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

