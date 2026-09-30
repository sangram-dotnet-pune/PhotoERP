use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::branding::Branding,
    models::template_settings::TemplateSettings,
};

const KEY_BRANDING: &str = "app_branding";
const KEY_TEMPLATE: &str = "app_template";

fn read_setting(conn: &Connection, key: &str, fallback: &str) -> String {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    )
    .unwrap_or_else(|_| fallback.to_string())
}

fn write_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map(|_| ())
    .map_err(|e| format!("Failed to save setting '{key}': {e}"))
}

fn is_valid_hex_color(value: &str) -> bool {
    let value = value.trim();
    let hex = value.strip_prefix('#').unwrap_or(value);

    hex.len() == 6 && hex.chars().all(|c| c.is_ascii_hexdigit())
}

fn validate_template(settings: &TemplateSettings) -> Result<(), String> {
    if settings.font_family.trim().is_empty() {
        return Err("Font family is required.".to_string());
    }

    const VALID_HEADER_STYLES: &[&str] = &["classic", "minimal", "modern"];
    const VALID_TABLE_STYLES: &[&str] = &["ribbon", "minimal", "bordered"];

    if !VALID_HEADER_STYLES.contains(&settings.header_style.as_str()) {
        return Err("Invalid header style.".to_string());
    }

    if !VALID_TABLE_STYLES.contains(&settings.service_table_style.as_str()) {
        return Err("Invalid services table style.".to_string());
    }

    for (label, color) in [
        ("Primary color", &settings.primary_color),
        ("Secondary color", &settings.secondary_color),
        ("Background color", &settings.background_color),
    ] {
        if !is_valid_hex_color(color) {
            return Err(format!("{label} must be a hex color like #B97862."));
        }
    }

    if !settings.font_size.is_finite()
        || !(8.0..=48.0).contains(&settings.font_size)
    {
        return Err("Font size must be between 8 and 48 px.".to_string());
    }

    for (label, value) in [
        ("Page margin", settings.page_margin),
        ("Header spacing", settings.header_spacing),
        ("Footer spacing", settings.footer_spacing),
    ] {
        if !value.is_finite() || !(0.0..=400.0).contains(&value) {
            return Err(format!("{label} must be between 0 and 400."));
        }
    }

    Ok(())
}

fn get_template_settings_core(conn: &Connection) -> TemplateSettings {
    let raw = read_setting(conn, KEY_TEMPLATE, "");

    if raw.is_empty() {
        return TemplateSettings::default();
    }

    serde_json::from_str(&raw).unwrap_or_else(|_| TemplateSettings::default())
}

#[tauri::command]
pub fn get_template_settings(app: AppHandle) -> Result<TemplateSettings, String> {
    let conn = connection::get_connection(&app)?;

    Ok(get_template_settings_core(&conn))
}

fn save_template_settings_core(
    conn: &Connection,
    settings: &TemplateSettings,
) -> Result<(), String> {
    validate_template(settings)?;

    let json = serde_json::to_string(settings)
        .map_err(|e| format!("Failed to serialize template settings: {e}"))?;

    write_setting(conn, KEY_TEMPLATE, &json)
}

#[tauri::command]
pub fn save_template_settings(app: AppHandle, settings: TemplateSettings) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    save_template_settings_core(&conn, &settings)
}

fn get_branding_core(conn: &Connection) -> Branding {
    let raw = read_setting(conn, KEY_BRANDING, "");

    if raw.is_empty() {
        return Branding::default();
    }

    serde_json::from_str(&raw).unwrap_or_else(|_| Branding::default())
}

#[tauri::command]
pub fn get_branding(app: AppHandle) -> Result<Branding, String> {
    let conn = connection::get_connection(&app)?;

    Ok(get_branding_core(&conn))
}

fn save_branding_core(conn: &Connection, branding: &Branding) -> Result<(), String> {
    for (label, color) in [
        ("Primary color", &branding.primary_color),
        ("Secondary color", &branding.secondary_color),
    ] {
        if !is_valid_hex_color(color) {
            return Err(format!("{label} must be a hex color like #B97862."));
        }
    }

    let json = serde_json::to_string(branding)
        .map_err(|e| format!("Failed to serialize branding: {e}"))?;

    write_setting(conn, KEY_BRANDING, &json)
}

#[tauri::command]
pub fn save_branding(app: AppHandle, branding: Branding) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    save_branding_core(&conn, &branding)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn template_settings_default_and_roundtrip() {
        let conn = crate::test_support::test_connection();

        let defaults = get_template_settings_core(&conn);
        assert_eq!(defaults.font_family, "Poppins");
        assert_eq!(defaults.header_style, "classic");

        let mut custom = defaults.clone();
        custom.font_family = "Georgia".to_string();
        custom.header_style = "modern".to_string();
        custom.primary_color = "#123456".to_string();

        save_template_settings_core(&conn, &custom).unwrap();

        let loaded = get_template_settings_core(&conn);
        assert_eq!(loaded.font_family, "Georgia");
        assert_eq!(loaded.header_style, "modern");
        assert_eq!(loaded.primary_color, "#123456");
    }

    #[test]
    fn invalid_template_settings_are_rejected() {
        let conn = crate::test_support::test_connection();

        let defaults = get_template_settings_core(&conn);

        let mut bad_style = defaults.clone();
        bad_style.header_style = "floral".to_string();
        assert!(save_template_settings_core(&conn, &bad_style).is_err());

        let mut bad_color = defaults.clone();
        bad_color.primary_color = "red".to_string();
        assert!(save_template_settings_core(&conn, &bad_color).is_err());

        let mut bad_size = defaults.clone();
        bad_size.font_size = 200.0;
        assert!(save_template_settings_core(&conn, &bad_size).is_err());
    }

    #[test]
    fn branding_roundtrip_and_validation() {
        let conn = crate::test_support::test_connection();

        assert_eq!(get_branding_core(&conn).primary_color, "#B97862");

        let custom = Branding {
            primary_color: "#112233".to_string(),
            secondary_color: "#AABBCC".to_string(),
        };

        save_branding_core(&conn, &custom).unwrap();

        let loaded = get_branding_core(&conn);
        assert_eq!(loaded.primary_color, "#112233");
        assert_eq!(loaded.secondary_color, "#AABBCC");

        let mut bad = custom.clone();
        bad.primary_color = "nope".to_string();
        assert!(save_branding_core(&conn, &bad).is_err());
    }
}