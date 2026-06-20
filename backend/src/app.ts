import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";

import { errorHandler } from "./shared/middlewares/errorHandler";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
    });
});

// Middleware global de errores
app.use(errorHandler);

export default app;