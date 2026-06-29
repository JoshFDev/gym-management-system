import { Router } from "express";
import { create, getAll, getById, update, deactivate, reactivate, categories } from "./product.controller";
import { validate } from "../../middlewares/validate.middleware";
import { createProductSchema, updateProductSchema } from "./product.validation";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get("/categories", authenticate, authorize("admin", "receptionist"), categories);
router.get("/", authenticate, authorize("admin", "receptionist"), getAll);
router.get("/:id", authenticate, authorize("admin", "receptionist"), getById);
router.post("/", authenticate, authorize("admin", "receptionist"), validate(createProductSchema), create);
router.put("/:id", authenticate, authorize("admin", "receptionist"), validate(updateProductSchema), update);
router.delete("/:id/deactivate", authenticate, authorize("admin", "receptionist"), deactivate);
router.patch("/:id/reactivate", authenticate, authorize("admin", "receptionist"), reactivate);

export default router;
