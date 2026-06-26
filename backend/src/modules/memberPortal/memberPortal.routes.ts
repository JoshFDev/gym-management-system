import { Router } from "express";
import { login, profile } from "./memberPortal.controller";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authLimiter } from "../../shared/middlewares/rateLimiters";

const router = Router();

router.post("/login", authLimiter, login);
router.get("/me", authenticate, profile);

export default router;
