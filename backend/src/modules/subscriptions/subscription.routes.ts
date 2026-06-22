import { Router } from "express";

import { create, getAll,renew } from "./subscription.controller";

import { validate } from "../../middlewares/validate.middleware";
import { createSubscriptionSchema } from "./subscription.validation";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("admin"),
    validate(createSubscriptionSchema),
    create
);

router.get(
    "/",
    authenticate,
    authorize("admin"),
    getAll
);

router.post(
    "/:id/renew",
    authenticate,
    authorize("admin"),
    renew
);

export default router;