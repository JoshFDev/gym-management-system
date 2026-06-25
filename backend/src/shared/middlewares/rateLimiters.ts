import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Demasiadas peticiones, intenta más tarde" },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Demasiados intentos de login, cuenta bloqueada 15 min" },
});

export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: "Demasiados registros desde esta IP" },
});