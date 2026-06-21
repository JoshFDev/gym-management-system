import { Router } from "express";

import { create, getAll, getById} from "./member.controller";

import { validate } from "../../middlewares/validate.middleware";

import { createMemberSchema } from "./member.validation";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

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


export default router;