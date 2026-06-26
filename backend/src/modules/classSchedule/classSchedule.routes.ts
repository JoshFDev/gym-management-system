import { Router } from "express";
import { create, getAll, getActive, getById, update, deactivate, activate, remove } from "./classSchedule.controller";
import { validate } from "../../middlewares/validate.middleware";
import { createClassSchema, updateClassSchema } from "./classSchedule.validation";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const router = Router();

router.get("/", authenticate, authorize("admin", "receptionist", "trainer"), getAll);
router.get("/active", authenticate, authorize("admin", "receptionist", "trainer"), getActive);
router.get("/:id", authenticate, authorize("admin", "receptionist", "trainer"), getById);
router.post("/", authenticate, authorize("admin"), validate(createClassSchema), create);
router.put("/:id", authenticate, authorize("admin"), validate(updateClassSchema), update);
router.patch("/:id/reactivate", authenticate, authorize("admin"), activate);
router.delete("/:id/permanent", authenticate, authorize("admin"), remove);
router.delete("/:id", authenticate, authorize("admin"), deactivate);

export default router;
