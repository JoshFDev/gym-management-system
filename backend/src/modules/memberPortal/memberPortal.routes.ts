import { Router } from "express";
import { login, profile } from "./memberPortal.controller";
import { authenticate } from "../../shared/middlewares/authenticate";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, profile);

export default router;
