use rusqlite::Connection;
use std::fs;
use tauri::{AppHandle, Manager};

/// Apply the connection-level PRAGMAs PhotoERP relies on:
/// - foreign_keys: ON (enforce referential integrity, e.g. ON DELETE CASCADE)
/// - journal_mode: WAL (concurrent readers + safer crash behavior)
/// - busy_timeout: wait instead of immediately erroring when the DB is busy
pub fn configure_connection(conn: &Connection) -> Result<(), String> {
    conn.pragma_update(None, "foreign_keys", true)
        .map_err(|e| format!("Failed to enable foreign keys: {e}"))?;

    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| format!("Failed to enable WAL mode: {e}"))?;

    conn.pragma_update(None, "busy_timeout", 5000)
        .map_err(|e| format!("Failed to set busy timeout: {e}"))?;

    Ok(())
}

pub fn get_connection(app: &AppHandle) -> Result<Connection, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    let db_path = app_dir.join("photoerp.db");

    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open SQLite database: {e}"))?;

    configure_connection(&conn)?;

    Ok(conn)
}