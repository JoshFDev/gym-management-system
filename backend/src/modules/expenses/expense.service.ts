import Expense from "./expense.model";
import { CreateExpenseInput, UpdateExpenseInput } from "./expense.validation";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export const createExpense = async (data: CreateExpenseInput & { createdBy: string }) => {
    const expense = await Expense.create({
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
        createdBy: data.createdBy,
    });
    return expense;
};

export const getExpenses = async (query: {
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    page?: number;
    limit?: number;
}) => {
    const filter: Record<string, unknown> = {};
    if (query.dateFrom || query.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (query.dateFrom) dateFilter.$gte = new Date(query.dateFrom);
        if (query.dateTo) dateFilter.$lte = new Date(query.dateTo);
        filter.date = dateFilter;
    }
    if (query.category) filter.category = query.category;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
        Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
        Expense.countDocuments(filter),
    ]);

    return { expenses, total, totalPages: Math.ceil(total / limit), page };
};

export const getExpenseById = async (id: string) => {
    const expense = await Expense.findById(id);
    if (!expense) throw new NotFoundError("Expense not found");
    return expense;
};

export const updateExpense = async (id: string, data: UpdateExpenseInput) => {
    const updateData: Record<string, unknown> = { ...data };
    if (data.date) updateData.date = new Date(data.date);
    const expense = await Expense.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true });
    if (!expense) throw new NotFoundError("Expense not found");
    return expense;
};

export const deleteExpense = async (id: string) => {
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) throw new NotFoundError("Expense not found");
    return expense;
};

export const getExpenseReport = async (dateFrom?: string, dateTo?: string) => {
    const filter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.$lte = new Date(dateTo);
        filter.date = dateFilter;
    }

    const expenses = await Expense.find(filter).sort({ date: 1 });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    }

    const daily: Record<string, number> = {};
    for (const e of expenses) {
        const key = e.date.toISOString().slice(0, 10);
        daily[key] = (daily[key] || 0) + e.amount;
    }

    return { total, count: expenses.length, byCategory, daily };
};
