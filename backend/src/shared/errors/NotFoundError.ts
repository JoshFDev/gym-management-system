import { AppError } from "./AppError";

export class NotFoundError extends AppError {
    constructor(message = "Recurso no encontrado") {
        super(message, 404);
    }
}