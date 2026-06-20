import { Router } from "express";
import { register } from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { registerSchema } from "./auth.validation";
import { login } from "./auth.controller";
import { loginSchema } from "./auth.validation";

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

export default router;