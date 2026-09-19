import { invoke } from '@tauri-apps/api/core';

import type { Expense } from '../features/expenses/types/expense.types';

class ExpenseService {
  async getExpenses(): Promise<Expense[]> {
    return invoke<Expense[]>('get_expenses');
  }

  async addExpense(expense: Omit<Expense, 'id'>): Promise<void> {
    return invoke('add_expense', { expense });
  }

  async updateExpense(expense: Expense): Promise<void> {
    return invoke('update_expense', { expense });
  }

  async deleteExpense(id: number): Promise<void> {
    return invoke('delete_expense', { id });
  }
}

export const expenseService = new ExpenseService();