import { Router } from "express";

import {
    create,
    getAll,
    update,
} from "./payment.controller";

import {
    createPaymentSchema,
    updatePaymentSchema,
} from "./payment.validation";

import { validate } from "../../middlewares/validate.middleware";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get(
    "/",
    authenticate,
    authorize("admin", "receptionist"),
    getAll
);

router.post(
    "/",
    authenticate,
    authorize("admin", "receptionist"),
    validate(createPaymentSchema),
    create
);

router.put(
    "/:id",
    authenticate,
    authorize("admin"),
    validate(updatePaymentSchema),
    update
);

export default router;