import { Router } from "express";
import { create, getAll, getById, update, remove, report } from "./expense.controller";
import { validate } from "../../middlewares/validate.middleware";
import { createExpenseSchema, updateExpenseSchema } from "./expense.validation";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get("/report", authenticate, authorize("admin"), report);
router.get("/", authenticate, authorize("admin"), getAll);
router.get("/:id", authenticate, authorize("admin"), getById);
router.post("/", authenticate, authorize("admin"), validate(createExpenseSchema), create);
router.put("/:id", authenticate, authorize("admin"), validate(updateExpenseSchema), update);
router.delete("/:id", authenticate, authorize("admin"), remove);

export default router;
