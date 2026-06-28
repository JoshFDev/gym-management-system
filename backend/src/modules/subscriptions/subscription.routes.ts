import { Router } from "express";

import { create, getAll, renew, cancel, remove } from "./subscription.controller";

import { validate } from "../../middlewares/validate.middleware";
import { createSubscriptionSchema } from "./subscription.validation";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("admin","receptionist"),
    validate(createSubscriptionSchema),
    create
);

router.get(
    "/",
    authenticate,
    authorize("admin","receptionist"),
    getAll
);

router.put(
    "/:id/renew",
    authenticate,
    authorize("admin","receptionist"),
    renew
);

router.patch(
    "/:id/cancel",
    authenticate,
    authorize("admin", "receptionist"),
    cancel
);

router.delete(
    "/:id",
    authenticate,
    authorize("admin", "receptionist"),
    remove
);

export default router;