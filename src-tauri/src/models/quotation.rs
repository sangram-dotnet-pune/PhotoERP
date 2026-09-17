use serde::{Deserialize, Serialize};

use super::client::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceItem {
    #[serde(default)]
    pub id: Option<i64>,
    pub service_name: String,
    pub quantity: i32,
    pub price: f64,
    pub total: f64,
    #[serde(default = "default_status")]
    pub status: String,
}

fn default_status() -> String {
    "Pending".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quotation {

     pub id: Option<i64>,
    pub quotation_number: String,

    #[serde(default)]
    pub quotation_date: String,

    /// When set, the quotation is linked to this already-existing client.
    /// When `None`, a new client is created from `client`.
    #[serde(default)]
    pub client_id: Option<i64>,

    pub client: Client,

    pub event_type: String,
    pub event_date: String,
    pub event_time: String,

    pub venue: String,
    pub city: String,

    #[serde(default)]
    pub event_notes: String,

    pub subtotal: f64,
    pub discount: f64,
    pub advance_amount: f64,
    pub total: f64,
    pub balance: f64,

    pub notes: String,

    #[serde(default = "default_workflow_status")]
    pub status: String,

    pub services: Vec<ServiceItem>,
}

fn default_workflow_status() -> String {
    "Draft".to_string()
}