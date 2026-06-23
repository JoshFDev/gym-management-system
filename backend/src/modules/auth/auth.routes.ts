import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { registerSchema } from "./auth.validation";
import { loginSchema } from "./auth.validation";
import { profile } from "./auth.controller";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";
import { adminOnly } from "./auth.controller";
import { forgotPasswordSchema } from "./auth.validation";
import { resetPasswordSchema } from "./auth.validation";
import {
    login,
    register,
    forgotPasswordHandler,
    resetPasswordHandler,
} from "./auth.controller";
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

router.post(
    "/forgot-password",
    validate(forgotPasswordSchema),
    forgotPasswordHandler
);

router.post(
    "/reset-password/:token",
    validate(resetPasswordSchema),
    resetPasswordHandler
);
export default router;