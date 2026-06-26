import { IExpense } from "./expense.model";

export interface ExpenseResponse {
    id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export const toExpenseResponse = (e: IExpense): ExpenseResponse => ({
    id: e._id.toString(),
    amount: e.amount,
    description: e.description,
    category: e.category,
    date: e.date.toISOString(),
    createdBy: e.createdBy.toString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
});
