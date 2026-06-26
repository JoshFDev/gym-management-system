import { z } from "zod";
import { ExpenseCategory } from "./expense.types";

export const createExpenseSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    description: z.string().trim().min(2, "Description is required"),
    category: z.nativeEnum(ExpenseCategory),
    date: z.string().datetime().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
