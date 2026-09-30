import type { ExpenseType } from './expense.types';

export interface ExpenseFormValues {
  expenseType: ExpenseType;
  quotationId: number | null;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  vendor: string;
  notes: string;
}