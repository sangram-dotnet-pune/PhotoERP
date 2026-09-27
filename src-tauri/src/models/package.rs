use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageService {
    pub id: Option<i64>,
    pub service_name: String,
    pub quantity: i64,
    pub price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReusablePackage {
    pub id: Option<i64>,
    pub name: String,
    #[serde(default)]
    pub services: Vec<PackageService>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogService {
    pub id: Option<i64>,
    pub name: String,
    pub price: f64,
}