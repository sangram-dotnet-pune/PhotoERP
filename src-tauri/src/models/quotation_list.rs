use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct QuotationListItem {
    pub id: i64,
    pub quotation_number: String,
    pub client_name: String,
    pub event_type: String,
    pub event_date: String,
    pub total: f64,
    pub balance: f64,
    pub status: String,
    pub workflow_status: String,
    pub paid: f64,
    pub venue: String,
    pub city: String,
    pub service_status: String,
}