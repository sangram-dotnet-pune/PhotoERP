use serde::{Deserialize, Serialize};

/// Studio / company details used across the PDF template and exported files.
#[derive(Debug, Serialize, Deserialize)]
pub struct StudioSettings {
    pub studio_name: String,
    pub studio_phone: String,
    pub studio_email: String,
    pub studio_website: String,
    pub studio_address: String,
}

impl Default for StudioSettings {
    fn default() -> Self {
        StudioSettings {
            studio_name: "Photo ERP Studio".to_string(),
            studio_phone: "+91 9022624329".to_string(),
            studio_email: "Jadhavomkar604@gmail.com".to_string(),
            studio_website: "www.photoerp.com".to_string(),
            studio_address: "".to_string(),
        }
    }
}