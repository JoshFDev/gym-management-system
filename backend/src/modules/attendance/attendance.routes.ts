import { Router } from "express";

import { create,getAll,} from "./attendance.controller";

import { validate } from "../../middlewares/validate.middleware";
import { createAttendanceSchema } from "./attendance.validation";

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
    validate(createAttendanceSchema),
    create
);

export default router;