import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.send("Gym Management API");
});

app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Gym Management API is running",
    });
});

export default app;