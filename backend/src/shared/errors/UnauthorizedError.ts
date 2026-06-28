import { AppError } from "./AppError";

export class UnauthorizedError extends AppError {
    constructor(message = "No autorizado") {
        super(message, 401);
    }
}