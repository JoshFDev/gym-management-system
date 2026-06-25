import { Router } from "express";

import { getStats } from "./dashboard.controller";

import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get(
    "/stats",
    authenticate,
    authorize("admin","receptionist"),
    getStats
);

export default router;