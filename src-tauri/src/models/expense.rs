use serde::{Deserialize, Serialize};

/// A single expense record, including optional quotation context so the UI can
/// show "QT-000123 — Rahul Sharma" for order-specific expenses without extra
/// round trips.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: i64,
    pub quotation_id: Option<i64>,
    pub expense_date: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub payment_method: String,
    pub vendor: String,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,

    // Joined (display-only) fields. Null for general expenses.
    #[serde(default)]
    pub quotation_number: Option<String>,
    #[serde(default)]
    pub client_name: Option<String>,
    #[serde(default)]
    pub event_type: Option<String>,
}

/// Payload for creating or updating an expense.
///
/// - General expense: `quotation_id` is `None`.
/// - Order expense: `quotation_id` is the id of the related quotation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseInput {
    pub quotation_id: Option<i64>,
    pub expense_date: String,
    pub category: String,
    pub description: String,
    pub amount: f64,
    pub payment_method: String,
    pub vendor: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseSummary {
    pub total: f64,
    pub order_total: f64,
    pub general_total: f64,
    pub this_month: f64,
}

/// Profitability for a single quotation, derived from actual payments
/// received (not the quoted total) minus order-specific expenses.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotationProfitability {
    pub quotation_id: i64,
    pub quotation_number: String,
    pub client_name: String,
    pub event_type: String,
    pub revenue_received: f64,
    pub order_expenses: f64,
    pub profit: f64,
}