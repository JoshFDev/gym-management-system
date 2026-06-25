import { Router } from "express";

import {
    create,
    getAll,
    getById,
    update,
    deactivate,
} from "./plan.controller";

import { validate } from "../../middlewares/validate.middleware";

import {
    createPlanSchema,
    updatePlanSchema,
} from "./plan.validation";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get(
    "/",
    authenticate,
    authorize("admin","receptionist"),
    getAll
);

router.get(
    "/:id",
    authenticate,
    authorize("admin","receptionist"),
    getById
);

router.post(
    "/",
    authenticate,
    authorize("admin"),
    validate(createPlanSchema),
    create
);

router.put(
    "/:id",
    authenticate,
    authorize("admin"),
    validate(updatePlanSchema),
    update
);

router.delete(
    "/:id",
    authenticate,
    authorize("admin"),
    deactivate
);

export default router;