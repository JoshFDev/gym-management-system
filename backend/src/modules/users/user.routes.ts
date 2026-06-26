import { Router } from "express";

import {
    getAll,
    update,
    remove,
} from "./user.controller";

import { validate } from "../../middlewares/validate.middleware";
import { updateUserSchema } from "./user.validation";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get(
    "/",
    authenticate,
    authorize("admin", "receptionist", "trainer"),
    getAll
);

router.patch(
    "/:id",
    authenticate,
    authorize("admin"),
    validate(updateUserSchema),
    update
);

router.delete(
    "/:id",
    authenticate,
    authorize("admin"),
    remove
);

export default router;