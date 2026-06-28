import { AppError } from "./AppError";

export class BadRequestError extends AppError {
    constructor(message = "Solicitud inválida") {
        super(message, 400);
    }
}