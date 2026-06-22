import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";

import { errorHandler } from "./shared/middlewares/errorHandler";

import memberRoutes from "./modules/members/member.routes";

import planRoutes from "./modules/plans/plan.routes";

import subscriptionRoutes from "./modules/subscriptions/subscription.routes";

import attendanceRoutes from "./modules/attendance/attendance.routes";

import paymentRoutes from "./modules/payments/payment.routes";

import dashboardRoutes from "./modules/dashboard/dashboard.routes";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions",subscriptionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);

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