import bcrypt from "bcrypt";
import User from "./auth.model";
import { RegisterInput, LoginInput } from "./auth.validation";
import { ConflictError } from "../../shared/errors/ConflictError";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";
import { generateToken } from "../../utils/jwt";

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