import { Router } from "express";

import { create,getAll,report,getActive,} from "./attendance.controller";

import { validate } from "../../middlewares/validate.middleware";
import { createAttendanceSchema } from "./attendance.validation";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get(
    "/",
    authenticate,
    authorize("admin", "receptionist", "trainer"),
    getAll
);

router.get(
    "/active",
    authenticate,
    authorize("admin", "receptionist", "trainer"),
    getActive
);

router.get(
    "/report",
    authenticate,
    authorize("admin", "receptionist", "trainer"),
    report
);

router.post(
    "/",
    authenticate,
    authorize("admin", "receptionist", "trainer"),
    validate(createAttendanceSchema),
    create
);

export default router;