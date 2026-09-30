import { invoke } from '@tauri-apps/api/core';

import type {
  CreateExpenseRequest,
  Expense,
  ExpenseSummary,
  QuotationProfitability,
  UpdateExpenseRequest,
} from '../features/expenses/types/expense.types';

class ExpenseService {
  async getExpenses(): Promise<Expense[]> {
    return invoke<Expense[]>('get_expenses');
  }

  async getExpenseById(id: number): Promise<Expense> {
    return invoke<Expense>('get_expense_by_id', { id });
  }

  async getExpensesByQuotation(quotationId: number): Promise<Expense[]> {
    return invoke<Expense[]>('get_expenses_by_quotation', { quotationId });
  }

  async createExpense(expense: CreateExpenseRequest): Promise<void> {
    return invoke('create_expense', { expense });
  }

  async updateExpense(expense: UpdateExpenseRequest): Promise<void> {
    return invoke('update_expense', {
      id: expense.id,
      expense: {
        quotation_id: expense.quotation_id,
        expense_date: expense.expense_date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        payment_method: expense.payment_method,
        vendor: expense.vendor,
        notes: expense.notes,
      },
    });
  }

  async deleteExpense(id: number): Promise<void> {
    return invoke('delete_expense', { id });
  }

  async getExpenseSummary(): Promise<ExpenseSummary> {
    return invoke<ExpenseSummary>('get_expense_summary');
  }

  async getQuotationProfitability(
    quotationId: number,
  ): Promise<QuotationProfitability> {
    return invoke<QuotationProfitability>('get_quotation_profitability', {
      quotationId,
    });
  }
}

export const expenseService = new ExpenseService();