import { AppError } from "./AppError";

export class ConflictError extends AppError {
    constructor(message = "Conflicto") {
        super(message, 409);
    }
}