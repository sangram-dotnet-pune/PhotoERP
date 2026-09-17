use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::database::migrations;

fn app_data_dir(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    fs::create_dir_all(&app_dir)
        .expect("Failed to create app data directory");

    app_dir
}

fn database_path(app: &AppHandle) -> PathBuf {
    app_data_dir(app).join("photoerp.db")
}

fn today_utc() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let days = secs / 86_400;
    let (y, m, d) = civil_from_days(days as i64);

    format!("{:04}-{:02}-{:02}", y, m, d)
}

// Convert days since 1970-01-01 to (year, month, day) using the
// standard civil-from-days algorithm (Howard Hinnant).
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// Validate that the given path is a real SQLite database containing the
/// core PhotoERP tables. Does not modify anything.
fn validate_photoerp_db(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("Backup file could not be found.".to_string());
    }

    if path.is_dir() {
        return Err("Selected path is not a file.".to_string());
    }

    let conn = Connection::open_with_flags(
        path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY
            | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|_| "Invalid PhotoERP backup file.".to_string())?;

    for table in ["clients", "quotations", "quotation_services"] {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                [table],
                |row| row.get(0),
            )
            .map_err(|e| {
                eprintln!("validate_backup: {e}");
                "Invalid PhotoERP backup file.".to_string()
            })?;

        if exists == 0 {
            return Err("Invalid PhotoERP backup file.".to_string());
        }
    }

    Ok(())
}

/// Export a complete, consistent snapshot of the current database into the
/// chosen destination path using SQLite's online backup API.
#[tauri::command]
pub fn backup_database(
    app: AppHandle,
    destination_path: String,
) -> Result<String, String> {
    let dest = PathBuf::from(&destination_path);

    if dest.is_dir() {
        return Err("Selected path is not a file.".to_string());
    }

    if let Some(parent) = dest.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| {
                    eprintln!("backup_database: {e}");
                    "Unable to create backup.".to_string()
                })?;
        }
    }

    let db_path = database_path(&app);

    let conn = Connection::open(&db_path).map_err(|e| {
        eprintln!("backup_database: {e}");
        "Unable to create backup.".to_string()
    })?;

    // SQLite online backup: produces a consistent copy even if other
    // connections are active, and never corrupts the source database.
    conn.backup("main", &dest, None)
        .map_err(|e| {
            eprintln!("backup_database: {e}");
            "Unable to create backup.".to_string()
        })?;

    Ok(dest.to_string_lossy().to_string())
}

/// Restore a validated backup. The flow is:
/// 1. Validate the selected file (exists, is SQLite, has core tables).
/// 2. Create a safety backup of the current database.
/// 3. Replace the current database using SQLite's online backup API.
/// 4. Reopen the database and run migrations.
#[tauri::command]
pub fn restore_database(
    app: AppHandle,
    backup_path: String,
) -> Result<String, String> {
    let backup = PathBuf::from(&backup_path);

    validate_photoerp_db(&backup)?;

    let db_path = database_path(&app);

    // ---------------------------------------------------------------
    // 1. Create a safety backup of the current database before restoring.
    //    This guarantees recovery if the wrong file is restored.
    // ---------------------------------------------------------------
    if db_path.exists() {
        let safety_path = app_data_dir(&app).join(format!(
            "photoerp-before-restore-{}.db",
            today_utc()
        ));

        // Avoid overwriting a safety backup made the same day.
        let mut idx = 1;
        let mut final_safety_path = safety_path.clone();

        while final_safety_path.exists() {
            final_safety_path = app_data_dir(&app).join(format!(
                "photoerp-before-restore-{}-{}.db",
                today_utc(),
                idx
            ));
            idx += 1;
        }

        let current = Connection::open(&db_path).map_err(|e| {
            eprintln!("restore_database (safety): {e}");
            "Unable to restore backup.".to_string()
        })?;

        current
            .backup("main", &final_safety_path, None)
            .map_err(|e| {
                eprintln!("restore_database (safety): {e}");
                "Unable to restore backup.".to_string()
            })?;
    }

    // ---------------------------------------------------------------
    // 2. Restore the selected backup into the live database.
    //    `Connection::restore` copies the backup file into the open
    //    connection's database using SQLite's online backup API, which
    //    safely manages locks and busy states.
    // ---------------------------------------------------------------
    let mut dest = Connection::open(&db_path).map_err(|e| {
        eprintln!("restore_database (open dest): {e}");
        "Unable to restore backup.".to_string()
    })?;

    dest.restore("main", &backup, None::<fn(rusqlite::backup::Progress)>)
        .map_err(|e| {
            eprintln!("restore_database: {e}");
            "Unable to restore backup.".to_string()
        })?;

    // ---------------------------------------------------------------
    // 3. Reopen the restored database and run migrations so that
    //    backups produced by an older version of PhotoERP are upgraded.
    // ---------------------------------------------------------------
    let restored = Connection::open(&db_path).map_err(|e| {
        eprintln!("restore_database (reopen): {e}");
        "Unable to restore backup.".to_string()
    })?;

    migrations::run(&restored)?;

    Ok("Backup restored successfully".to_string())
}

#[derive(serde::Serialize)]
pub struct DatabaseInfo {
    pub database_path: String,
    pub database_size: i64,
    pub database_modified: i64,
    pub has_safety_backup: bool,
}

/// Return information about the current database that can actually be
/// retrieved (path, size, last modified time).
#[tauri::command]
pub fn get_database_info(
    app: AppHandle,
) -> Result<DatabaseInfo, String> {
    let db_path = database_path(&app);

    let info = fs::metadata(&db_path)
        .map_err(|e| {
            eprintln!("get_database_info: {e}");
            "Unable to read database information.".to_string()
        })?;

    let modified = info
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let safety_exists = fs::read_dir(app_data_dir(&app))
        .map(|entries| {
            entries.flatten().any(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("photoerp-before-restore-")
            })
        })
        .unwrap_or(false);

    Ok(DatabaseInfo {
        database_path: db_path.to_string_lossy().to_string(),
        database_size: info.len() as i64,
        database_modified: modified,
        has_safety_backup: safety_exists,
    })
}