import { Request, Response } from "express";
import { registerUser } from "./auth.service";
import { toUserResponse } from "./auth.dto";

export const register = async (
    req: Request,
    res: Response
) => {
    try {

        const user = await registerUser(req.body);

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: toUserResponse(user),
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Registration failed.",
        });

    }
};