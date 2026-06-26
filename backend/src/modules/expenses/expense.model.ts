import { Schema, model, Document, Types } from "mongoose";
import { ExpenseCategory } from "./expense.types";

export interface IExpense extends Document {
    amount: number;
    description: string;
    category: ExpenseCategory;
    date: Date;
    createdBy: Types.ObjectId | string;
    createdAt: Date;
    updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
    {
        amount: { type: Number, required: true, min: 0 },
        description: { type: String, required: true, trim: true },
        category: { type: String, required: true, enum: Object.values(ExpenseCategory) },
        date: { type: Date, required: true, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

const Expense = model<IExpense>("Expense", expenseSchema);
export default Expense;
