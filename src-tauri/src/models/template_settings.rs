use serde::{Deserialize, Serialize};

/// Presentation-only settings that control how the quotation PDF is styled.
/// These never affect quotation calculations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct TemplateSettings {
    pub font_family: String,
    pub font_size: f64,
    pub primary_color: String,
    pub secondary_color: String,
    pub background_color: String,
    pub header_style: String,
    pub quotation_title: String,
    pub show_logo: bool,
    pub show_quotation_meta: bool,
    pub show_client_section: bool,
    pub show_event_section: bool,
    pub show_services_section: bool,
    pub show_service_prices: bool,
    pub service_table_style: String,
    pub show_totals_section: bool,
    pub show_terms: bool,
    pub terms_and_conditions: String,
    pub show_signature: bool,
    pub signature_name: String,
    pub signature_role: String,
    pub show_footer: bool,
    pub footer_text: String,
    pub footer_contact: bool,
    pub page_margin: f64,
    pub header_spacing: f64,
    pub footer_spacing: f64,
}

impl Default for TemplateSettings {
    fn default() -> Self {
        TemplateSettings {
            font_family: "Poppins".to_string(),
            font_size: 13.5,
            primary_color: "#B97862".to_string(),
            secondary_color: "#965944".to_string(),
            background_color: "#F8F3E8".to_string(),
            header_style: "classic".to_string(),
            quotation_title: "QUOTATION".to_string(),
            show_logo: true,
            show_quotation_meta: true,
            show_client_section: true,
            show_event_section: true,
            show_services_section: true,
            show_service_prices: false,
            service_table_style: "ribbon".to_string(),
            show_totals_section: true,
            show_terms: true,
            terms_and_conditions: concat!(
                "50% advance required to confirm the booking.\n",
                "Balance payment must be cleared before the event.\n",
                "No cancellation or refund after confirmation.\n",
                "Extra coverage hours will be charged separately.\n",
                "Travelling and accommodation charges are extra if applicable."
            )
            .to_string(),
            show_signature: false,
            signature_name: String::new(),
            signature_role: String::new(),
            show_footer: true,
            footer_text: "Thank you for choosing us!".to_string(),
            footer_contact: true,
            page_margin: 0.0,
            header_spacing: 30.0,
            footer_spacing: 30.0,
        }
    }
}