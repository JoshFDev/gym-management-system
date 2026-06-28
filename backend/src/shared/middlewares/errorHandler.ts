import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {

    // Errores personalizados de la aplicación
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }

    // Log para desarrolladores
    console.error("Unexpected Error:", err);

    // Error genérico para el cliente
    res.status(500).json({
        success: false,
        message: "Error interno del servidor",
    });
};