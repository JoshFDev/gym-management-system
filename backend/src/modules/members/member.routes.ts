import { Router } from "express";

import { create, getAll, getById, deactivate} from "./member.controller";

import { validate } from "../../middlewares/validate.middleware";

import { createMemberSchema, updateMemberSchema } from "./member.validation";

import { authenticate } from "../../shared/middlewares/authenticate";

import { authorize } from "../../shared/middlewares/authorize";

import { update } from "./member.controller";



const router = Router();

router.post(
    "/",
    authenticate,
    authorize("admin"),
    validate(createMemberSchema),
    create
);

router.get(
    "/",
    authenticate,
    authorize("admin"),
    getAll
);

router.get(
    "/:id",
    authenticate,
    authorize("admin"),
    getById
);

router.put(
    "/:id",
    authenticate,
    authorize("admin"),
    validate(updateMemberSchema),
    update
);

router.delete(
    "/:id",
    authenticate,
    authorize("admin"),
    deactivate
);

export default router;