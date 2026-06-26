export enum ExpenseCategory {
    RENT = "rent",
    SALARY = "salary",
    MAINTENANCE = "maintenance",
    SUPPLIES = "supplies",
    UTILITIES = "utilities",
    MARKETING = "marketing",
    OTHER = "other",
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    [ExpenseCategory.RENT]: "Renta",
    [ExpenseCategory.SALARY]: "Sueldos",
    [ExpenseCategory.MAINTENANCE]: "Mantenimiento",
    [ExpenseCategory.SUPPLIES]: "Insumos",
    [ExpenseCategory.UTILITIES]: "Servicios",
    [ExpenseCategory.MARKETING]: "Publicidad",
    [ExpenseCategory.OTHER]: "Otros",
};
