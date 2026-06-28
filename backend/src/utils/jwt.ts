import jwt, { SignOptions } from "jsonwebtoken";

interface JwtPayload {
    userId: string;
    role: string;
}

export const generateToken = (
    payload: JwtPayload
): string => {

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET no está definido.");
    }

    const options: SignOptions = {
        expiresIn: "7d",
    };

    return jwt.sign(payload, secret, options);

};

export const verifyToken = (
    token: string
): JwtPayload => {

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET no está definido.");
    }

    return jwt.verify(
        token,
        secret
    ) as JwtPayload;

};