import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { registerSchema } from "./auth.validation";
import { loginSchema } from "./auth.validation";
import { profile } from "./auth.controller";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";
import { adminOnly } from "./auth.controller";
import { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "./auth.validation";
import {
    login,
    register,
    forgotPasswordHandler,
    resetPasswordHandler,
    changePasswordHandler,
} from "./auth.controller";

import { authLimiter, signupLimiter, passwordLimiter } from "../../shared/middlewares/rateLimiters";


const router = Router();

router.post("/register", signupLimiter, validate(registerSchema), register);  // ← acá
router.post("/login",    authLimiter,   validate(loginSchema),    login);     // ← acá
router.get("/profile",   authenticate, profile);
router.get("/admin",     authenticate, authorize("admin"), adminOnly);
router.post("/forgot-password", passwordLimiter, validate(forgotPasswordSchema), forgotPasswordHandler);
router.post("/reset-password/:token", passwordLimiter, validate(resetPasswordSchema), resetPasswordHandler);
router.put("/change-password", authenticate, validate(changePasswordSchema), changePasswordHandler);
export default router;