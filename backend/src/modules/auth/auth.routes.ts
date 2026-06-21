import { Router } from "express";
import { register } from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { registerSchema } from "./auth.validation";
import { login } from "./auth.controller";
import { loginSchema } from "./auth.validation";
import { profile } from "./auth.controller";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";
import { adminOnly } from "./auth.controller";

const router = Router();

router.post(
    "/register",
    validate(registerSchema),
    register
);

router.post(
    "/login",
    validate(loginSchema),
    login
);

router.get(
    "/profile",
    authenticate,
    profile
);
router.get(
    "/admin",
    authenticate,
    authorize("admin"),
    adminOnly
);
export default router;