use serde::{Deserialize, Serialize};

/// Count of quotations per workflow status (Draft, Sent, Confirmed, ...).
#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

/// Revenue grouped by calendar month (based on actual payments received).
#[derive(Debug, Serialize, Deserialize)]
pub struct RevenueSummary {
    pub month: String,
    pub amount: f64,
}

/// Top clients by total business (sum of quotation totals) for reports.
#[derive(Debug, Serialize, Deserialize)]
pub struct TopClient {
    pub client_name: String,
    pub event_count: i64,
    pub total_business: f64,
    pub amount_paid: f64,
    pub pending_amount: f64,
    pub payment_status: String,
}

/// High-level business report pulled together from payments + quotations.
#[derive(Debug, Serialize, Deserialize)]
pub struct ReportsSummary {
    pub total_quotations: i64,
    pub total_quotation_value: f64,
    pub total_revenue: f64,
    pub total_pending: f64,
    pub quotations_with_payments: i64,
    pub workflow_summary: Vec<StatusCount>,
    pub payment_summary: Vec<StatusCount>,
}

/// A single payment row enriched with its quotation and client for the
/// recent-payments view. Amounts come straight from the payments table.
#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentRecord {
    pub id: i64,
    pub quotation_id: i64,
    pub quotation_number: String,
    pub client_name: String,
    pub amount: f64,
    pub payment_date: String,
    pub payment_method: String,
    pub notes: String,
}

/// Per-client financial aggregation used by the pending-payments view.
#[derive(Debug, Serialize, Deserialize)]
pub struct PendingClient {
    pub client_id: i64,
    pub client_name: String,
    pub total_business: f64,
    pub amount_paid: f64,
    pub pending_amount: f64,
}