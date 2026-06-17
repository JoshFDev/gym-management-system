import express from "express";
import cors from "cors";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Gym Management API is running 🚀",
    });
});

export default app;