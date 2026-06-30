import { Router } from "express";
import { create, getAll, getById, returnSaleHandler } from "./sale.controller";
import { validate } from "../../middlewares/validate.middleware";
import { createSaleSchema, returnSaleSchema } from "./sale.validation";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get("/", authenticate, authorize("admin", "receptionist"), getAll);
router.get("/:id", authenticate, authorize("admin", "receptionist"), getById);
router.post("/", authenticate, authorize("admin", "receptionist"), validate(createSaleSchema), create);
router.post("/:id/return", authenticate, authorize("admin", "receptionist"), returnSaleHandler);

export default router;
