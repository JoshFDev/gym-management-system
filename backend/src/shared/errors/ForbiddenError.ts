import { AppError } from "./AppError";

export class ForbiddenError extends AppError {
    constructor(
        message = "Prohibido"
    ) {
        super(message, 403);
    }
}