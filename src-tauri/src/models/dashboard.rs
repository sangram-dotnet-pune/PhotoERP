use serde::{Deserialize, Serialize};

use crate::models::quotation_list::QuotationListItem;
use crate::models::reports::StatusCount;

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_quotations: i64,
    pub total_revenue: f64,
    pub pending_balance: f64,
    pub upcoming_events: i64,
    pub workflow_summary: Vec<StatusCount>,
    pub recent_quotations: Vec<QuotationListItem>,
    pub upcoming_event_list: Vec<QuotationListItem>,
}