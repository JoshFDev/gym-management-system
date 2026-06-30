import { Router } from "express";
import { catalog, categories } from "./memberPortal.controller";

const router = Router();

router.get("/products", catalog);
router.get("/categories", categories);

export default router;
