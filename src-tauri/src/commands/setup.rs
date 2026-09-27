use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::{
    database::connection,
    models::setup::SetupStatus,
};

const KEY_SETUP_COMPLETED: &str = "setup_completed";

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

fn has_existing_records(conn: &Connection) -> Result<bool, String> {
    let clients: i64 = conn
        .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count clients: {e}"))?;

    let quotations: i64 = conn
        .query_row("SELECT COUNT(*) FROM quotations", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count quotations: {e}"))?;

    Ok(clients > 0 || quotations > 0)
}

fn get_setup_status_core(conn: &Connection) -> Result<SetupStatus, String> {
    let mut completed = read_setting(conn, KEY_SETUP_COMPLETED, "0") == "1";

    // Existing PhotoERP databases (before setup flag was introduced) already
    // contain business data. Treat them as set up so nothing is lost or reset;
    // only brand-new installations run the wizard.
    if !completed && has_existing_records(conn)? {
        write_setting(conn, KEY_SETUP_COMPLETED, "1")?;
        completed = true;
    }

    Ok(SetupStatus { completed })
}

#[tauri::command]
pub fn get_setup_status(app: AppHandle) -> Result<SetupStatus, String> {
    let conn = connection::get_connection(&app)?;

    get_setup_status_core(&conn)
}

fn complete_setup_core(conn: &Connection) -> Result<(), String> {
    write_setting(conn, KEY_SETUP_COMPLETED, "1")
}

#[tauri::command]
pub fn complete_setup(app: AppHandle) -> Result<(), String> {
    let conn = connection::get_connection(&app)?;

    complete_setup_core(&conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_database_is_not_setup() {
        let conn = crate::test_support::test_connection();

        let status = get_setup_status_core(&conn).unwrap();

        assert!(!status.completed);
    }

    #[test]
    fn database_with_records_is_treated_as_setup() {
        let conn = crate::test_support::test_connection();

        conn.execute(
            "INSERT INTO clients (name) VALUES (?1)",
            params!["Existing Client"],
        )
        .unwrap();

        let status = get_setup_status_core(&conn).unwrap();

        assert!(status.completed);

        // The flag is now persisted so it stays completed on next launch.
        assert_eq!(read_setting(&conn, KEY_SETUP_COMPLETED, ""), "1");
    }

    #[test]
    fn complete_setup_persists_flag() {
        let conn = crate::test_support::test_connection();

        complete_setup_core(&conn).unwrap();

        assert_eq!(read_setting(&conn, KEY_SETUP_COMPLETED, ""), "1");
        assert!(get_setup_status_core(&conn).unwrap().completed);
    }
}