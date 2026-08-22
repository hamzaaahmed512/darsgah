export const INCOME_CATEGORIES = ["student_fee", "grant", "donation", "admission", "transport", "other_income"] as const;
export const EXPENSE_CATEGORIES = ["rent", "staff_pay", "renovation", "utilities", "supplies", "transport", "maintenance", "other_expense"] as const;
export const TRANSACTION_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;
export type TransactionDirection = "income" | "expense";
export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  student_fee: "Student Fee",
  grant: "Grant",
  donation: "Donation",
  admission: "Admission",
  transport: "Transport",
  other_income: "Other Income",
  rent: "Rent",
  staff_pay: "Staff Pay",
  renovation: "Renovation",
  utilities: "Utilities",
  supplies: "Supplies",
  maintenance: "Maintenance",
  other_expense: "Other Expense"
};
