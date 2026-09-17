export interface StatusCount {
  status: string;
  count: number;
}

export interface TopClient {
  client_name: string;
  event_count: number;
  total_business: number;
  amount_paid: number;
  pending_amount: number;
  payment_status: string;
}

export interface ReportsSummary {
  total_quotations: number;
  total_quotation_value: number;
  total_revenue: number;
  total_pending: number;
  quotations_with_payments: number;
  workflow_summary: StatusCount[];
  payment_summary: StatusCount[];
}

export interface PaymentRecord {
  id: number;
  quotation_id: number;
  quotation_number: string;
  client_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
}

export interface PendingClient {
  client_id: number;
  client_name: string;
  total_business: number;
  amount_paid: number;
  pending_amount: number;
}