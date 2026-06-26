import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { memberLogin, getMemberProfile } from "./memberPortal.service";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError";

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const data = await memberLogin(email, password);
    res.status(200).json({ success: true, data });
});

export const profile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== "member") throw new UnauthorizedError("Acceso solo para miembros");
    const member = await getMemberProfile(req.user.userId);
    res.status(200).json({
        success: true,
        data: {
            id: member._id.toString(),
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            membershipStatus: member.membershipStatus,
        },
    });
});
