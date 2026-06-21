import { Request, Response } from "express";

import { toMemberResponse } from "./member.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";

import { createMember, getMembers, getMemberById, updateMember, deactivateMember} from "./member.service";

export const create = asyncHandler(
    async (req: Request, res: Response) => {

        const member = await createMember(
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Member created successfully.",
            data: toMemberResponse(member),
        });

    }
);

export const getAll = asyncHandler(
    async (_req: Request, res: Response) => {

        const members = await getMembers();

        res.status(200).json({
            success: true,
            data: members.map(
                toMemberResponse
            ),
        });

    }
);

export const getById = asyncHandler(
    async (req: Request, res: Response) => {

        const member = await getMemberById(
            req.params.id as string
        );

        res.status(200).json({
            success: true,
            data: toMemberResponse(member),
        });

    }
);

export const update = asyncHandler(
    async (req: Request, res: Response) => {

        const member = await updateMember(
            req.params.id as string,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Member updated successfully.",
            data: toMemberResponse(member),
        });

    }
);

export const deactivate = asyncHandler(
    async (req: Request, res: Response) => {

        const member = await deactivateMember(
            req.params.id as string
        );

        res.status(200).json({
            success: true,
            message: "Member deactivated successfully.",
            data: toMemberResponse(member),
        });

    }
);