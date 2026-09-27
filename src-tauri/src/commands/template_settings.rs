use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::branding::Branding,
    models::template_settings::TemplateSettings,
};

const KEY_BRANDING: &str = "app_branding";
const KEY_TEMPLATE: &str = "app_template";
const KEY_LOGO: &str = "logo_data";

const MAX_LOGO_BYTES: u64 = 3 * 1024 * 1024;

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

#[tauri::command]
pub fn get_logo(app: AppHandle) -> Result<String, String> {
    let conn = connection::get_connection(&app)?;

    Ok(read_setting(&conn, KEY_LOGO, ""))
}

#[tauri::command]
pub fn clear_logo(app: AppHandle) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    write_setting(&conn, KEY_LOGO, "")
}

fn mime_for_path(path: &str) -> Option<&'static str> {
    let lower = path.to_lowercase();

    if lower.ends_with(".png") {
        Some("image/png")
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        Some("image/jpeg")
    } else if lower.ends_with(".webp") {
        Some("image/webp")
    } else if lower.ends_with(".gif") {
        Some("image/gif")
    } else if lower.ends_with(".svg") {
        Some("image/svg+xml")
    } else {
        None
    }
}

fn save_logo_from_path_core(conn: &Connection, path: &str) -> Result<(), String> {
    let mime = mime_for_path(path)
        .ok_or_else(|| "Logo must be a PNG, JPG, WEBP, GIF or SVG image.".to_string())?;

    let metadata = std::fs::metadata(path)
        .map_err(|e| format!("Failed to read logo file: {e}"))?;

    if metadata.len() > MAX_LOGO_BYTES {
        return Err("Logo image is too large. Maximum size is 3 MB.".to_string());
    }

    let bytes = std::fs::read(path)
        .map_err(|e| format!("Failed to read logo file: {e}"))?;

    if bytes.is_empty() {
        return Err("Logo file is empty.".to_string());
    }

    let encoded = BASE64.encode(bytes);
    let data_url = format!("data:{mime};base64,{encoded}");

    write_setting(conn, KEY_LOGO, &data_url)
}

#[tauri::command]
pub fn save_logo_from_path(app: AppHandle, path: String) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    save_logo_from_path_core(&conn, &path)
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

    #[test]
    fn logo_is_stored_as_data_url_only_for_valid_images() {
        let conn = crate::test_support::test_connection();

        assert_eq!(read_setting(&conn, KEY_LOGO, ""), "");

        // Write a tiny valid png to a temp file.
        let png_bytes = vec![
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        ];

        let mut path = std::env::temp_dir();
        path.push("photoerp_test_logo.png");
        std::fs::write(&path, &png_bytes).unwrap();

        save_logo_from_path_core(&conn, path.to_str().unwrap()).unwrap();

        let stored = read_setting(&conn, KEY_LOGO, "");
        assert!(stored.starts_with("data:image/png;base64,"));

        let unsupported = std::env::temp_dir().join("photoerp_test_logo.txt");
        std::fs::write(&unsupported, b"hello").unwrap();

        assert!(save_logo_from_path_core(&conn, unsupported.to_str().unwrap()).is_err());
        assert!(save_logo_from_path_core(&conn, "/definitely/not/a/file.png").is_err());

        std::fs::remove_file(path).ok();
        std::fs::remove_file(unsupported).ok();
    }
}