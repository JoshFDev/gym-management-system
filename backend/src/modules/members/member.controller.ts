import { Request, Response } from "express";

import { toMemberResponse } from "./member.dto";

import { asyncHandler } from "../../shared/middlewares/asyncHandler";

import { createMember, getMembers, getMemberById, } from "./member.service";

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