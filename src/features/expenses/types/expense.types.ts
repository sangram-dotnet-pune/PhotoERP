// ==============================
// Expense record (with joined quotation context)
// ==============================

export interface Expense {
  id: number;
  quotation_id: number | null;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  vendor: string;
  notes: string;
  created_at: string;
  updated_at: string;
  quotation_number: string | null;
  client_name: string | null;
  event_type: string | null;
}

// ==============================
// Create / update payloads
// ==============================

export interface CreateExpenseRequest {
  quotation_id: number | null;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  vendor: string;
  notes: string;
}

export interface UpdateExpenseRequest extends CreateExpenseRequest {
  id: number;
}

// ==============================
// Summary + profitability
// ==============================

export interface ExpenseSummary {
  total: number;
  order_total: number;
  general_total: number;
  this_month: number;
}

export interface QuotationProfitability {
  quotation_id: number;
  quotation_number: string;
  client_name: string;
  event_type: string;
  revenue_received: number;
  order_expenses: number;
  profit: number;
}

// ==============================
// Form modelling
// ==============================

export const EXPENSE_TYPES = ['General', 'Order Expense'] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  'Equipment',
  'Person',
  'Travel',
  'Food',
  'Props',
  'Marketing',
  'Software',
  'Studio Rent',
  'Utilities',
  'Other',
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Cheque',
  'Other',
] as const;

export const QUOTATION_LABEL_SEPARATOR = ' — ';

export const quotationDisplayLabel = (
  quotationNumber: string,
  clientName: string,
  eventType?: string,
) =>
  [quotationNumber, clientName, eventType].filter(Boolean).join(QUOTATION_LABEL_SEPARATOR);