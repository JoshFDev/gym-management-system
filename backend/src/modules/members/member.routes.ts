import { Router } from "express";

import { create, getAll, getById, deactivate, remove, sendQREmail } from "./member.controller";

import { validate } from "../../middlewares/validate.middleware";

import { createMemberSchema, updateMemberSchema } from "./member.validation";

import { authenticate } from "../../shared/middlewares/authenticate";

import { authorize } from "../../shared/middlewares/authorize";

import { update } from "./member.controller";



const router = Router();

router.post(
    "/",
    authenticate,
    authorize("admin", "receptionist"),
    validate(createMemberSchema),
    create
);

router.get(
    "/",
    authenticate,
    authorize("admin","trainer","receptionist"),
    getAll
);

router.get(
    "/:id",
    authenticate,
    authorize("admin","receptionist","trainer"),
    getById
);

router.put(
    "/:id",
    authenticate,
    authorize("admin", "receptionist"),
    validate(updateMemberSchema),
    update
);

router.delete(
    "/:id",
    authenticate,
    authorize("admin", "receptionist"),
    deactivate
);

router.delete(
    "/:id/force",
    authenticate,
    authorize("admin"),
    remove
);

router.post(
    "/:id/send-qr",
    authenticate,
    authorize("admin", "receptionist"),
    sendQREmail
);

export default router;