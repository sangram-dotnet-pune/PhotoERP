use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: Option<i64>,
    pub expense_type: String,
    pub note: String,
    pub amount: f64,
    pub expense_date: String,
}