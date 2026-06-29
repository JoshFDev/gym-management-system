import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { create, getAll, getById, update, deactivate, reactivate, categories, uploadImage, deleteImage } from "./product.controller";
import { validate } from "../../middlewares/validate.middleware";
import { createProductSchema, updateProductSchema } from "./product.validation";
import { authenticate } from "../../shared/middlewares/authenticate";
import { authorize } from "../../shared/middlewares/authorize";

const uploadDir = path.join(__dirname, "../../../uploads/products");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp)$/i;
        if (allowed.test(path.extname(file.originalname))) return cb(null, true);
        cb(new Error("Solo imágenes JPG, JPEG, PNG o WEBP"));
    },
});

const router = Router();

router.get("/categories", authenticate, authorize("admin", "receptionist"), categories);
router.get("/", authenticate, authorize("admin", "receptionist"), getAll);
router.get("/:id", authenticate, authorize("admin", "receptionist"), getById);
router.post("/", authenticate, authorize("admin", "receptionist"), validate(createProductSchema), create);
router.put("/:id", authenticate, authorize("admin", "receptionist"), validate(updateProductSchema), update);
router.delete("/:id/deactivate", authenticate, authorize("admin", "receptionist"), deactivate);
router.patch("/:id/reactivate", authenticate, authorize("admin", "receptionist"), reactivate);
router.post("/:id/upload", authenticate, authorize("admin", "receptionist"), upload.single("image"), uploadImage);
router.delete("/:id/image", authenticate, authorize("admin", "receptionist"), deleteImage);

export default router;
