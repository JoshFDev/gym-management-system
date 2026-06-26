import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";

import { errorHandler } from "./shared/middlewares/errorHandler";

import memberRoutes from "./modules/members/member.routes";
import memberPortalRoutes from "./modules/memberPortal/memberPortal.routes";

import planRoutes from "./modules/plans/plan.routes";

import subscriptionRoutes from "./modules/subscriptions/subscription.routes";

import attendanceRoutes from "./modules/attendance/attendance.routes";
import classScheduleRoutes from "./modules/classSchedule/classSchedule.routes";
import paymentRoutes from "./modules/payments/payment.routes";

import dashboardRoutes from "./modules/dashboard/dashboard.routes";

import userRoutes from "./modules/users/user.routes";
import auditLogRoutes from "./modules/auditLog/auditLog.routes";

import { generalLimiter } from "./shared/middlewares/rateLimiters";

import pino from "pino";

import pinoHttp from "pino-http";

import helmet from "helmet";

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport:
        process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
});

const app = express();
app.use(helmet());
app.use(pinoHttp({ logger }));  // ← loguea cada petición HTTP


// Middlewares
app.use(cors());
app.use(express.json());
app.use('/api', generalLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/member", memberPortalRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/classes", classScheduleRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/audit-logs", auditLogRoutes);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
    });
});

// Middleware global de errores
app.use(errorHandler);

export default app;