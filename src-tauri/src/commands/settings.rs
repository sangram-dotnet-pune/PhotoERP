use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::settings::StudioSettings,
};

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

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<StudioSettings, String> {
    let defaults = StudioSettings::default();

    let conn = connection::get_connection(&app)?;

    Ok(StudioSettings {
        studio_name: read_setting(&conn, "studio_name", &defaults.studio_name),
        studio_phone: read_setting(&conn, "studio_phone", &defaults.studio_phone),
        studio_email: read_setting(&conn, "studio_email", &defaults.studio_email),
        studio_website: read_setting(&conn, "studio_website", &defaults.studio_website),
        studio_address: read_setting(&conn, "studio_address", &defaults.studio_address),
    })
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: StudioSettings) -> Result<(), String> {
    if settings.studio_name.trim().is_empty() {
        return Err("Studio name is required.".to_string());
    }

    let conn = connection::get_connection(&app)?;

    write_setting(&conn, "studio_name", &settings.studio_name)?;
    write_setting(&conn, "studio_phone", &settings.studio_phone)?;
    write_setting(&conn, "studio_email", &settings.studio_email)?;
    write_setting(&conn, "studio_website", &settings.studio_website)?;
    write_setting(&conn, "studio_address", &settings.studio_address)?;

    Ok(())
}