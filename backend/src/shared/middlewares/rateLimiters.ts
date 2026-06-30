import rateLimit from "express-rate-limit";

const config = process.env.NODE_ENV === "test"
    ? { windowMs: 1, max: 10000 }
    : { windowMs: 15 * 60 * 1000, max: 100 };

export const generalLimiter = rateLimit({
    ...config,
    message: { success: false, message: "Demasiadas peticiones, intenta más tarde" },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 10000 : 5,
    message: { success: false, message: "Demasiados intentos de login, cuenta bloqueada 15 min" },
});

export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 10000 : 3,
    message: { success: false, message: "Demasiados registros desde esta IP" },
});

export const passwordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 10000 : 3,
    message: { success: false, message: "Demasiadas solicitudes, intenta más tarde" },
});