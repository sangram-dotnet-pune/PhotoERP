// ==============================
// Expense Item
// ==============================

export interface Expense {
  id: number | null;
  expense_type: string;
  note: string;
  amount: number;
  expense_date: string;
}

// ==============================
// Expense form state (no id yet)
// ==============================

export type ExpenseFormState = Omit<Expense, 'id'>;

export const EXPENSE_TYPES = ['Person', 'Equipment', 'Other'] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];