import { Router } from "express";

import {
    create,
    getAll,
    update,
    refund,
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
    authorize("admin","receptionist"),
    validate(updatePaymentSchema),
    update
);

router.post(
    "/:id/refund",
    authenticate,
    authorize("admin"),
    refund
);

export default router;