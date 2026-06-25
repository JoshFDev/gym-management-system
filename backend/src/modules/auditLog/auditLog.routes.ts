import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";
import { getAll } from "./auditLog.controller";

const router = Router();

router.get("/", authenticate, authorize("admin"), getAll);

export default router;
