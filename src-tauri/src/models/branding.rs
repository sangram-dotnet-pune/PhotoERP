use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branding {
    #[serde(default = "default_primary_color")]
    pub primary_color: String,
    #[serde(default = "default_secondary_color")]
    pub secondary_color: String,
}

impl Default for Branding {
    fn default() -> Self {
        Branding {
            primary_color: default_primary_color(),
            secondary_color: default_secondary_color(),
        }
    }
}

fn default_primary_color() -> String {
    "#B97862".to_string()
}

fn default_secondary_color() -> String {
    "#965944".to_string()
}